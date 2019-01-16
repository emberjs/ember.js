import {
  AnnotatedModuleLocator,
  CompilableProgram,
  ComponentDefinition,
  GlimmerTreeChanges,
  GlimmerTreeConstruction,
  Helper as GlimmerHelper,
  JitRuntimeContext,
  Maybe,
  ModifierManager,
  Option,
  SyntaxCompilationContext,
  Template,
  TemplateIterator,
  TemplateMeta,
} from '@glimmer/interfaces';
import { PartialDefinition } from '@glimmer/opcode-compiler';
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
import { SimpleDocument } from '@simple-dom/interface';
import {
  BasicComponentFactory,
  EmberishCurlyComponentFactory,
  EmberishGlimmerComponentFactory,
} from '../../components';
import TestEnvironment from '../../environment';
import { UserHelper } from '../../helper';
import TestMacros from '../../macros';
import {
  InertModifierDefinitionState,
  InertModifierManager,
  TestModifierConstructor,
} from '../../modifier';
import { preprocess } from '../../shared';
import { TestLazyCompilationContext } from './compilation-context';
import LazyRuntimeResolver from './runtime-resolver';
import {
  registerBasicComponent,
  registerTemplate,
  registerStaticTaglessComponent,
  registerEmberishCurlyComponent,
  registerEmberishGlimmerComponent,
  registerHelper,
  registerInternalHelper,
  registerInternalModifier,
  registerModifier,
  registerPartial,
  resolveHelper,
  resolvePartial,
} from './register';

export interface TestEnvironmentOptions {
  document?: SimpleDocument;
  appendOperations?: GlimmerTreeConstruction;
  updateOperations?: GlimmerTreeChanges;
  program?: CompilableProgram;
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

export function componentHelper(
  resolver: LazyRuntimeResolver,
  name: string
): Option<CurriedComponentDefinition> {
  let handle = resolver.lookupComponentHandle(name);

  if (handle === null) return null;

  let spec = resolver.resolve<ComponentDefinition>(handle);
  return curry(spec);
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
