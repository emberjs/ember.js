import { Option, Maybe, Simple, CompilableProgram, ComponentCapabilities, AnnotatedModuleLocator } from "@glimmer/interfaces";
import {
  Helper as GlimmerHelper,
  DOMTreeConstruction,
  ModifierManager,
  ComponentDefinition,
  CompilationOptions,
  IDOMChanges,
  DOMChanges,
  VM,
  Arguments,
  getDynamicVar,
  CurriedComponentDefinition,
  curry,
  ComponentManager,
  renderMain,
  DynamicScope,
  ElementBuilder,
  TemplateIterator
} from "@glimmer/runtime";
import { Template } from "@glimmer/interfaces";
import { templateFactory, PartialDefinition, LazyCompiler } from "@glimmer/opcode-compiler";
import { precompile } from "@glimmer/compiler";
import { Program } from "@glimmer/program";
import { TestDynamicScope } from "../../../environment";
import TestEnvironment from '../../environment';
import { ComponentKind } from '../../../render-test';

import LazyCompilerResolver from './compiler-resolver';
import LazyRuntimeResolver from './runtime-resolver';

import {
  BasicComponentFactory,
  BasicComponentManager,
  BASIC_CAPABILITIES,
  EmberishCurlyComponent,
  EmberishCurlyComponentFactory,
  EmberishCurlyComponentManager,
  CURLY_CAPABILITIES,
  EmberishGlimmerComponent,
  EmberishGlimmerComponentFactory,
  EmberishGlimmerComponentManager,
  EMBERISH_GLIMMER_CAPABILITIES,
  StaticTaglessComponentManager,
  STATIC_TAGLESS_CAPABILITIES,
  TestComponentDefinitionState,
  locatorFor
} from '../../components';

import { UserHelper, HelperReference } from '../../helper';
import { InertModifierManager } from '../../modifier';
import TestMacros from '../../macros';
import { Opaque } from "@glimmer/util";
import { PathReference } from "@glimmer/reference";
import { TemplateMeta } from "@glimmer/wire-format";

const BASIC_COMPONENT_MANAGER = new BasicComponentManager();
const EMBERISH_CURLY_COMPONENT_MANAGER = new EmberishCurlyComponentManager();
const EMBERISH_GLIMMER_COMPONENT_MANAGER = new EmberishGlimmerComponentManager();
const STATIC_TAGLESS_COMPONENT_MANAGER = new StaticTaglessComponentManager();

export interface TestEnvironmentOptions {
  document?: Simple.Document;
  appendOperations?: DOMTreeConstruction;
  updateOperations?: IDOMChanges;
  program?: CompilableProgram;
}

export interface TestMeta extends TemplateMeta {
  version: number;
  lang: string;
  moduleName: string;
  owner?: {};
}

export const DEFAULT_TEST_META = Object.freeze({
  version: 1,
  lang: 'en',
  moduleName: 'index'
});

export type TestCompilationOptions = CompilationOptions<AnnotatedModuleLocator, LazyRuntimeResolver>;

export default class LazyTestEnvironment extends TestEnvironment<TestMeta> {
  public resolver = new LazyRuntimeResolver();
  protected program: Program<TestMeta>;

  public compiler: LazyCompiler<TestMeta>;

  constructor(options?: TestEnvironmentOptions) {
    super(testOptions(options));

    this.compiler = LazyCompiler.default<TestMeta>({
      lookup: new LazyCompilerResolver(this.resolver),
      resolver: this.resolver,
      macros: new TestMacros()
    });

    this.program = this.compiler.program;

    // recursive field, so "unsafely" set one half late (but before the resolver is actually used)
    this.resolver['compiler'] = this.compiler;
    this.registerHelper("if", ([cond, yes, no]) => cond ? yes : no);
    this.registerHelper("unless", ([cond, yes, no]) => cond ? no : yes);
    this.registerInternalHelper("-get-dynamic-var", getDynamicVar);
    this.registerModifier("action", new InertModifierManager());

    this.registerInternalHelper("hash", (_vm: VM, args: Arguments) => args.capture().named);
  }

  renderMain<T>(template: Template<T>, self: PathReference<Opaque>, builder: ElementBuilder, dynamicScope: DynamicScope = new TestDynamicScope()): TemplateIterator {
    let layout = template.asLayout();
    let handle = layout.compile();
    // TODO, figure out runtime program stuff
    return renderMain(this.program, this, self, dynamicScope, builder, handle);
  }

  registerTemplate(name: string, source: string): { name: string, handle: number } {
    return { name, handle: this.resolver.register("template-source", name, source) };
  }

  registerBasicComponent(name: string, Component: BasicComponentFactory, layoutSource: string): void {
    if (name.indexOf('-') !== -1) {
      throw new Error("DEPRECATED: dasherized components");
    }

    let { handle } = this.registerTemplate(name, layoutSource);

    this.registerComponent(name, 'Basic', BASIC_COMPONENT_MANAGER, handle, Component, BASIC_CAPABILITIES);
  }

  registerStaticTaglessComponent(name: string, Component: BasicComponentFactory, layoutSource: string): void {
    let { handle } = this.registerTemplate(name, layoutSource);

    this.registerComponent(name, 'Fragment', STATIC_TAGLESS_COMPONENT_MANAGER, handle, Component, STATIC_TAGLESS_CAPABILITIES);
  }

  registerEmberishCurlyComponent(name: string, Component: Option<EmberishCurlyComponentFactory>, layoutSource: Option<string>): void {
    let layout: Option<{ name: string, handle: number }> = null;

    if (layoutSource !== null) {
      layout = this.registerTemplate(name, layoutSource);
    }

    let handle = layout ? layout.handle : null;
    let ComponentClass = Component || EmberishCurlyComponent;

    this.registerComponent(name, 'Curly', EMBERISH_CURLY_COMPONENT_MANAGER, handle, ComponentClass, CURLY_CAPABILITIES);
  }

  registerEmberishGlimmerComponent(name: string, Component: Option<EmberishGlimmerComponentFactory>, layoutSource: string): void {
    if (name.indexOf('-') !== -1) {
      throw new Error("DEPRECATED: dasherized components");
    }

    let { handle } = this.registerTemplate(name, layoutSource);

    let ComponentClass = Component || EmberishGlimmerComponent;

    this.registerComponent(name, 'Glimmer', EMBERISH_GLIMMER_COMPONENT_MANAGER, handle, ComponentClass, EMBERISH_GLIMMER_CAPABILITIES);
  }

  registerHelper(name: string, helper: UserHelper): GlimmerHelper {
    let glimmerHelper = (_vm: VM, args: Arguments) => new HelperReference(helper, args);
    this.resolver.register('helper', name, glimmerHelper);
    return glimmerHelper;
  }

  registerInternalHelper(name: string, helper: GlimmerHelper): GlimmerHelper {
    this.resolver.register('helper', name, helper);
    return helper;
  }

  registerModifier(name: string, modifier: ModifierManager<any>): ModifierManager {
    this.resolver.register('modifier', name, modifier);
    return modifier;
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

  resolveModifier(modifierName: string): Option<ModifierManager> {
    let handle = this.resolver.lookupModifier(modifierName);
    return handle === null ? null : this.resolver.resolve<ModifierManager>(handle);
  }

  preprocess(template: string, meta?: TestMeta): Template<TemplateMeta> {
    let wrapper = JSON.parse(precompile(template));
    let factory = templateFactory(wrapper);
    return factory.create(this.compiler, (meta || {}) as any as TemplateMeta);
  }

  private registerComponent(name: string, type: ComponentKind, manager: ComponentManager<Opaque, Opaque>, layout: Option<number>, ComponentClass: Opaque, capabilities: ComponentCapabilities) {
    let state: TestComponentDefinitionState = {
      name,
      type,
      layout,
      locator: locatorFor({ module: name, name: 'default' }),
      capabilities,
      ComponentClass
    };

    let definition = {
      state,
      manager
    };

    this.resolver.register('component', name, definition);
    return definition;
  }
}

function testOptions(options: Maybe<TestEnvironmentOptions>) {
  let document: Maybe<Simple.Document> = options ? options.document : undefined;
  let appendOperations: Maybe<DOMTreeConstruction> = options && options.appendOperations;
  let updateOperations: Maybe<IDOMChanges> = options && options.updateOperations;

  if (!document) document = window.document;

  if (!appendOperations) {
    appendOperations = new DOMTreeConstruction(document);
  }

  if (!updateOperations) {
    updateOperations = new DOMChanges(document as HTMLDocument);
  }

  return { appendOperations, updateOperations };
}
