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
  WholeProgramCompilationContext,
  TemplateIterator,
  JitRuntimeContext,
} from '@glimmer/interfaces';
import { compileStd, PartialDefinition } from '@glimmer/opcode-compiler';
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
import { preprocess } from '../../shared';

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

export class TestLazyCompilationContext implements WholeProgramCompilationContext, RuntimeProgram {
  readonly constants = new Constants(this.runtimeResolver);
  readonly resolverDelegate: LazyCompileTimeLookup;
  readonly heap = new CompileTimeHeapImpl();
  readonly mode = CompileMode.jit;
  readonly stdlib: STDLib;

  constructor(private runtimeResolver: LazyRuntimeResolver) {
    this.stdlib = compileStd(this);
    this.resolverDelegate = new LazyCompileTimeLookup(runtimeResolver);

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
  private resolver = new LazyRuntimeResolver();
  private program = new TestLazyCompilationContext(this.resolver);
  private macros = new TestMacros();

  constructor(options?: TestEnvironmentOptions) {
    super(testOptions(options));

    let manager = new InertModifierManager();
    let state = new InertModifierDefinitionState();
    this.registerHelper('if', ([cond, yes, no]) => (cond ? yes : no));
    this.registerHelper('unless', ([cond, yes, no]) => (cond ? no : yes));
    this.registerInternalHelper('-get-dynamic-var', getDynamicVar);
    this.registerInternalModifier('action', manager, state);

    this.registerInternalHelper('hash', args => args.capture().named);
  }

  renderMain(
    template: Template,
    self: PathReference<unknown>,
    builder: ElementBuilder
  ): TemplateIterator {
    let layout = template.asLayout();
    let context = { program: this.program, macros: this.macros };
    let handle = layout.compile(context);
    // TODO, figure out runtime program stuff
    return renderJitMain(
      { program: this.program, env: this, resolver: this.resolver },
      context,
      self,
      builder,
      handle
    );
  }

  registerTemplate(name: string, source: string): { name: string; handle: number } {
    return registerTemplate(this.resolver, name, source);
  }

  registerBasicComponent(
    name: string,
    Component: BasicComponentFactory,
    layoutSource: string
  ): void {
    return registerBasicComponent(this.resolver, name, Component, layoutSource);
  }

  registerStaticTaglessComponent(
    name: string,
    Component: BasicComponentFactory,
    layoutSource: string
  ): void {
    return registerStaticTaglessComponent(this.resolver, name, Component, layoutSource);
  }

  registerEmberishCurlyComponent(
    name: string,
    Component: Option<EmberishCurlyComponentFactory>,
    layoutSource: Option<string>
  ): void {
    return registerEmberishCurlyComponent(this.resolver, name, Component, layoutSource);
  }

  registerEmberishGlimmerComponent(
    name: string,
    Component: Option<EmberishGlimmerComponentFactory>,
    layoutSource: string
  ): void {
    return registerEmberishGlimmerComponent(this.resolver, name, Component, layoutSource);
  }

  registerHelper(name: string, helper: UserHelper): GlimmerHelper {
    return registerHelper(this.resolver, name, helper);
  }

  registerInternalHelper(name: string, helper: GlimmerHelper): GlimmerHelper {
    return registerInternalHelper(this.resolver, name, helper);
  }

  registerInternalModifier(
    name: string,
    manager: ModifierManager<unknown, unknown>,
    state: unknown
  ) {
    return registerInternalModifier(this.resolver, name, manager, state);
  }

  registerModifier(name: string, ModifierClass?: TestModifierConstructor) {
    return registerModifier(this.resolver, name, ModifierClass);
  }

  registerPartial(name: string, source: string): PartialDefinition {
    return registerPartial(this.resolver, name, source);
  }

  resolveHelper(helperName: string): Option<GlimmerHelper> {
    return resolveHelper(this.resolver, helperName);
  }

  resolvePartial(partialName: string): Option<PartialDefinition> {
    return resolvePartial(this.resolver, partialName);
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
    return preprocess(template, meta);
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

export function registerTemplate(
  resolver: LazyRuntimeResolver,
  name: string,
  source: string
): { name: string; handle: number } {
  return { name, handle: resolver.register('template-source', name, source) };
}

export function registerBasicComponent(
  resolver: LazyRuntimeResolver,
  name: string,
  Component: BasicComponentFactory,
  layoutSource: string
): void {
  if (name.indexOf('-') !== -1) {
    throw new Error('DEPRECATED: dasherized components');
  }

  let { handle } = registerTemplate(resolver, name, layoutSource);

  registerComponent(
    resolver,
    name,
    'Basic',
    BASIC_COMPONENT_MANAGER,
    handle,
    Component,
    BASIC_CAPABILITIES
  );
}

export function registerStaticTaglessComponent(
  resolver: LazyRuntimeResolver,
  name: string,
  Component: BasicComponentFactory,
  layoutSource: string
): void {
  let { handle } = registerTemplate(resolver, name, layoutSource);

  registerComponent(
    resolver,
    name,
    'Fragment',
    STATIC_TAGLESS_COMPONENT_MANAGER,
    handle,
    Component,
    STATIC_TAGLESS_CAPABILITIES
  );
}

export function registerEmberishCurlyComponent(
  resolver: LazyRuntimeResolver,
  name: string,
  Component: Option<EmberishCurlyComponentFactory>,
  layoutSource: Option<string>
): void {
  let layout: Option<{ name: string; handle: number }> = null;

  if (layoutSource !== null) {
    layout = registerTemplate(resolver, name, layoutSource);
  }

  let handle = layout ? layout.handle : null;
  let ComponentClass = Component || EmberishCurlyComponent;

  registerComponent(
    resolver,
    name,
    'Curly',
    EMBERISH_CURLY_COMPONENT_MANAGER,
    handle,
    ComponentClass,
    CURLY_CAPABILITIES
  );
}

export function registerEmberishGlimmerComponent(
  resolver: LazyRuntimeResolver,
  name: string,
  Component: Option<EmberishGlimmerComponentFactory>,
  layoutSource: string
): void {
  if (name.indexOf('-') !== -1) {
    throw new Error('DEPRECATED: dasherized components');
  }

  let { handle } = registerTemplate(resolver, name, layoutSource);

  let ComponentClass = Component || EmberishGlimmerComponent;

  registerComponent(
    resolver,
    name,
    'Glimmer',
    EMBERISH_GLIMMER_COMPONENT_MANAGER,
    handle,
    ComponentClass,
    EMBERISH_GLIMMER_CAPABILITIES
  );
}

export function registerHelper(
  resolver: LazyRuntimeResolver,
  name: string,
  helper: UserHelper
): GlimmerHelper {
  let glimmerHelper: GlimmerHelper = args => new HelperReference(helper, args);
  resolver.register('helper', name, glimmerHelper);
  return glimmerHelper;
}

export function registerInternalHelper(
  resolver: LazyRuntimeResolver,
  name: string,
  helper: GlimmerHelper
): GlimmerHelper {
  resolver.register('helper', name, helper);
  return helper;
}

export function registerInternalModifier(
  resolver: LazyRuntimeResolver,
  name: string,
  manager: ModifierManager<unknown, unknown>,
  state: unknown
) {
  resolver.register('modifier', name, { manager, state });
}

export function registerModifier(
  resolver: LazyRuntimeResolver,
  name: string,
  ModifierClass?: TestModifierConstructor
) {
  let state = new TestModifierDefinitionState(ModifierClass);
  let manager = new TestModifierManager();
  resolver.register('modifier', name, { manager, state });
  return { manager, state };
}

export function registerPartial(
  resolver: LazyRuntimeResolver,
  name: string,
  source: string
): PartialDefinition {
  let definition = new PartialDefinition(name, preprocess(source));
  resolver.register('partial', name, definition);
  return definition;
}

function resolveHelper(resolver: LazyRuntimeResolver, helperName: string): Option<GlimmerHelper> {
  let handle = resolver.lookupHelper(helperName);
  return typeof handle === 'number' ? resolver.resolve<GlimmerHelper>(handle) : null;
}

function resolvePartial(
  resolver: LazyRuntimeResolver,
  partialName: string
): Option<PartialDefinition> {
  let handle = resolver.lookupPartial(partialName);
  return typeof handle === 'number' ? resolver.resolve<PartialDefinition>(handle) : null;
}

export function registerComponent(
  resolver: LazyRuntimeResolver,
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

  resolver.register('component', name, definition);
  return definition;
}

export function renderMain(
  runtime: JitRuntimeContext,
  syntax: SyntaxCompilationContext,
  template: Template,
  self: PathReference,
  builder: ElementBuilder
) {
  let layout = template.asLayout();
  let handle = layout.compile(syntax);
  // TODO, figure out runtime program stuff
  return renderJitMain(runtime, syntax, self, builder, handle);
}
