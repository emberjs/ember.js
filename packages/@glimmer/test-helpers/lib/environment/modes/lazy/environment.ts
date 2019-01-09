import { precompile } from '@glimmer/compiler';
import {
  AnnotatedModuleLocator,
  CompilableProgram,
  CompileMode,
  ComponentCapabilities,
  ComponentDefinition,
  ComponentManager,
  GlimmerTreeChanges,
  GlimmerTreeConstruction,
  Helper as GlimmerHelper,
  Maybe,
  ModifierManager,
  Option,
  RuntimeProgram,
  STDLib,
  SyntaxCompilationContext,
  Template,
  TemplateMeta,
  VMArguments,
  WholeProgramCompilationContext,
  TemplateIterator,
  VM,
} from '@glimmer/interfaces';
import { compileStd, PartialDefinition, templateFactory } from '@glimmer/opcode-compiler';
import { CompileTimeHeapImpl, Constants, RuntimeOpImpl } from '@glimmer/program';
import { PathReference } from '@glimmer/reference';
import {
  CurriedComponentDefinition,
  curry,
  DOMChanges,
  DOMTreeConstruction,
  ElementBuilder,
  getDynamicVar,
  ModifierDefinition,
  renderJitMain,
} from '@glimmer/runtime';
import { ComponentKind } from '@glimmer/test-helpers';
import { templateMeta } from '@glimmer/util';
import { SimpleDocument } from '@simple-dom/interface';
import {
  BasicComponentFactory,
  BasicComponentManager,
  BASIC_CAPABILITIES,
  CURLY_CAPABILITIES,
  EmberishCurlyComponent,
  EmberishCurlyComponentFactory,
  EmberishCurlyComponentManager,
  EmberishGlimmerComponent,
  EmberishGlimmerComponentFactory,
  EmberishGlimmerComponentManager,
  EMBERISH_GLIMMER_CAPABILITIES,
  locatorFor,
  StaticTaglessComponentManager,
  STATIC_TAGLESS_CAPABILITIES,
  TestComponentDefinitionState,
} from '../../components';
import TestEnvironment from '../../environment';
import { HelperReference, UserHelper } from '../../helper';
import TestMacros from '../../macros';
import {
  InertModifierDefinitionState,
  InertModifierManager,
  TestModifierConstructor,
  TestModifierDefinitionState,
  TestModifierManager,
} from '../../modifier';
import LazyCompileTimeLookup from './lookup';
import LazyRuntimeResolver from './runtime-resolver';

const BASIC_COMPONENT_MANAGER = new BasicComponentManager();
const EMBERISH_CURLY_COMPONENT_MANAGER = new EmberishCurlyComponentManager();
const EMBERISH_GLIMMER_COMPONENT_MANAGER = new EmberishGlimmerComponentManager();
const STATIC_TAGLESS_COMPONENT_MANAGER = new StaticTaglessComponentManager();

export interface TestEnvironmentOptions {
  document?: SimpleDocument;
  appendOperations?: GlimmerTreeConstruction;
  updateOperations?: GlimmerTreeChanges;
  program?: CompilableProgram;
}

export const DEFAULT_TEST_META: AnnotatedModuleLocator = Object.freeze({
  kind: 'unknown',
  meta: {},
  module: 'some/template',
  name: 'default',
});

export class TestCompilationContext implements WholeProgramCompilationContext, RuntimeProgram {
  readonly runtimeResolver = new LazyRuntimeResolver();
  readonly constants = new Constants(this.runtimeResolver);
  readonly resolverDelegate = new LazyCompileTimeLookup(this.runtimeResolver);
  readonly heap = new CompileTimeHeapImpl();
  readonly mode = CompileMode.jit;
  readonly stdlib: STDLib;

  constructor() {
    this.stdlib = compileStd(this);

    this._opcode = new RuntimeOpImpl(this.heap);
  }

  // TODO: This sucks
  private _opcode: RuntimeOpImpl;

  opcode(offset: number): RuntimeOpImpl {
    this._opcode.offset = offset;
    return this._opcode;
  }
}

export default class LazyTestEnvironment extends TestEnvironment {
  readonly resolver: LazyRuntimeResolver;
  readonly program: TestCompilationContext;

  get context(): SyntaxCompilationContext {
    return {
      program: this.program,
      macros: new TestMacros(),
    };
  }

  constructor(options?: TestEnvironmentOptions) {
    super(testOptions(options));

    let context = new TestCompilationContext();

    this.resolver = context.runtimeResolver;

    this.program = context;
    this.resolver = context.runtimeResolver;

    let manager = new InertModifierManager();
    let state = new InertModifierDefinitionState();
    this.registerHelper('if', ([cond, yes, no]) => (cond ? yes : no));
    this.registerHelper('unless', ([cond, yes, no]) => (cond ? no : yes));
    this.registerInternalHelper('-get-dynamic-var', getDynamicVar);
    this.registerInternalModifier('action', manager, state);

    this.registerInternalHelper('hash', (_vm, args) => args.capture().named);
  }

  renderMain(
    template: Template,
    self: PathReference<unknown>,
    builder: ElementBuilder
  ): TemplateIterator {
    let layout = template.asLayout();
    let handle = layout.compile(this.context);
    // TODO, figure out runtime program stuff
    return renderJitMain(
      { program: this.program, env: this, resolver: this.resolver },
      this.context,
      self,
      builder,
      handle
    );
  }

  registerTemplate(name: string, source: string): { name: string; handle: number } {
    return { name, handle: this.resolver.register('template-source', name, source) };
  }

  registerBasicComponent(
    name: string,
    Component: BasicComponentFactory,
    layoutSource: string
  ): void {
    if (name.indexOf('-') !== -1) {
      throw new Error('DEPRECATED: dasherized components');
    }

    let { handle } = this.registerTemplate(name, layoutSource);

    this.registerComponent(
      name,
      'Basic',
      BASIC_COMPONENT_MANAGER,
      handle,
      Component,
      BASIC_CAPABILITIES
    );
  }

  registerStaticTaglessComponent(
    name: string,
    Component: BasicComponentFactory,
    layoutSource: string
  ): void {
    let { handle } = this.registerTemplate(name, layoutSource);

    this.registerComponent(
      name,
      'Fragment',
      STATIC_TAGLESS_COMPONENT_MANAGER,
      handle,
      Component,
      STATIC_TAGLESS_CAPABILITIES
    );
  }

  registerEmberishCurlyComponent(
    name: string,
    Component: Option<EmberishCurlyComponentFactory>,
    layoutSource: Option<string>
  ): void {
    let layout: Option<{ name: string; handle: number }> = null;

    if (layoutSource !== null) {
      layout = this.registerTemplate(name, layoutSource);
    }

    let handle = layout ? layout.handle : null;
    let ComponentClass = Component || EmberishCurlyComponent;

    this.registerComponent(
      name,
      'Curly',
      EMBERISH_CURLY_COMPONENT_MANAGER,
      handle,
      ComponentClass,
      CURLY_CAPABILITIES
    );
  }

  registerEmberishGlimmerComponent(
    name: string,
    Component: Option<EmberishGlimmerComponentFactory>,
    layoutSource: string
  ): void {
    if (name.indexOf('-') !== -1) {
      throw new Error('DEPRECATED: dasherized components');
    }

    let { handle } = this.registerTemplate(name, layoutSource);

    let ComponentClass = Component || EmberishGlimmerComponent;

    this.registerComponent(
      name,
      'Glimmer',
      EMBERISH_GLIMMER_COMPONENT_MANAGER,
      handle,
      ComponentClass,
      EMBERISH_GLIMMER_CAPABILITIES
    );
  }

  registerHelper(name: string, helper: UserHelper): GlimmerHelper {
    let glimmerHelper = (_vm: VM, args: VMArguments) => new HelperReference(helper, args);
    this.resolver.register('helper', name, glimmerHelper);
    return glimmerHelper;
  }

  registerInternalHelper(name: string, helper: GlimmerHelper): GlimmerHelper {
    this.resolver.register('helper', name, helper);
    return helper;
  }

  registerInternalModifier(
    name: string,
    manager: ModifierManager<unknown, unknown>,
    state: unknown
  ) {
    this.resolver.register('modifier', name, { manager, state });
  }

  registerModifier(name: string, ModifierClass?: TestModifierConstructor) {
    let state = new TestModifierDefinitionState(ModifierClass);
    let manager = new TestModifierManager();
    this.resolver.register('modifier', name, { manager, state });
    return { manager, state };
  }

  registerPartial(name: string, source: string): PartialDefinition {
    let definition = new PartialDefinition(name, this.preprocess(source));
    this.resolver.register('partial', name, definition);
    return definition;
  }

  resolveHelper(helperName: string): Option<GlimmerHelper> {
    let handle = this.resolver.lookupHelper(helperName);
    return typeof handle === 'number' ? this.resolver.resolve<GlimmerHelper>(handle) : null;
  }

  resolvePartial(partialName: string): Option<PartialDefinition> {
    let handle = this.resolver.lookupPartial(partialName);
    return typeof handle === 'number' ? this.resolver.resolve<PartialDefinition>(handle) : null;
  }

  componentHelper(name: string): Option<CurriedComponentDefinition> {
    let handle = this.resolver.lookupComponentHandle(name);

    if (handle === null) return null;

    let spec = this.resolver.resolve<ComponentDefinition>(handle);
    return curry(spec);
  }

  resolveModifier(modifierName: string): Option<ModifierDefinition> {
    let handle = this.resolver.lookupModifier(modifierName);
    return handle === null ? null : this.resolver.resolve<ModifierDefinition>(handle);
  }

  preprocess(
    template: string,
    meta?: AnnotatedModuleLocator
  ): Template<TemplateMeta<AnnotatedModuleLocator>> {
    let wrapper = JSON.parse(precompile(template));
    let factory = templateFactory<AnnotatedModuleLocator>(wrapper);
    return factory.create(templateMeta(meta || DEFAULT_TEST_META));
  }

  private registerComponent(
    name: string,
    type: ComponentKind,
    manager: ComponentManager<unknown, unknown>,
    layout: Option<number>,
    ComponentClass: unknown,
    capabilities: ComponentCapabilities
  ) {
    let state: TestComponentDefinitionState = {
      name,
      type,
      layout,
      locator: locatorFor({ module: name, name: 'default' }),
      capabilities,
      ComponentClass,
    };

    let definition = {
      state,
      manager,
    };

    this.resolver.register('component', name, definition);
    return definition;
  }
}

function testOptions(options: Maybe<TestEnvironmentOptions>) {
  let document: Maybe<SimpleDocument> = options ? options.document : undefined;
  let appendOperations: Maybe<GlimmerTreeConstruction> = options && options.appendOperations;
  let updateOperations: Maybe<GlimmerTreeChanges> = options && options.updateOperations;

  if (!document) document = window.document as SimpleDocument;

  if (!appendOperations) {
    appendOperations = new DOMTreeConstruction(document);
  }

  if (!updateOperations) {
    updateOperations = new DOMChanges(document);
  }

  return { appendOperations, updateOperations };
}
