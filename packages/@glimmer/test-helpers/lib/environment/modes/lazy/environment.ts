import { Option, Maybe, Simple } from "@glimmer/interfaces";
import {
  Helper as GlimmerHelper,
  DOMTreeConstruction,
  TopLevelSyntax,
  ModifierManager,
  PartialDefinition,
  ComponentDefinition,
  CompilationOptions,
  templateFactory,
  Template,
  IDOMChanges,
  DOMChanges,
  VM,
  Arguments,
  getDynamicVar,
  CurriedComponentDefinition,
  curry
} from "@glimmer/runtime";
import { TemplateOptions, LazyOpcodeBuilder, OpcodeBuilderConstructor } from "@glimmer/opcode-compiler";
import { precompile } from "@glimmer/compiler";
import { LazyConstants, Program } from "@glimmer/program";

import TestEnvironment from '../../environment';

import LazyCompilerResolver from './compiler-resolver';
import LazyRuntimeResolver from './runtime-resolver';

import {
  BasicComponentFactory,
  BasicComponentDefinition,
  BASIC_COMPONENT_MANAGER,
  StaticTaglessComponentDefinition,
  STATIC_TAGLESS_COMPONENT_MANAGER,
  EmberishCurlyComponentFactory,
  EmberishCurlyComponentDefinition,
  EMBERISH_CURLY_COMPONENT_MANAGER,
  EmberishGlimmerComponentFactory,
  EmberishCurlyComponent,
  EmberishGlimmerComponentDefinition,
  EMBERISH_GLIMMER_COMPONENT_MANAGER,
  EmberishGlimmerComponent
} from '../../components';

import { UserHelper, HelperReference } from '../../helper';
import { InertModifierManager } from '../../modifier';
import TestMacros from '../../macros';
import TestSpecifier from '../../specifier';

export interface TestEnvironmentOptions {
  document?: Simple.Document;
  appendOperations?: DOMTreeConstruction;
  updateOperations?: IDOMChanges;
  program?: TopLevelSyntax;
}

export type TestCompilationOptions = CompilationOptions<TestSpecifier, LazyRuntimeResolver>;

export class LazyTestEnvironment extends TestEnvironment<TestSpecifier> {
  public resolver = new LazyRuntimeResolver();
  protected program = new Program(new LazyConstants(this.resolver));

  public compileOptions: TemplateOptions<TestSpecifier> = {
    lookup: new LazyCompilerResolver(this.resolver),
    program: this.program,
    macros: new TestMacros(),
    Builder: LazyOpcodeBuilder as OpcodeBuilderConstructor
  };

  constructor(options?: TestEnvironmentOptions) {
    super(testOptions(options));
    // recursive field, so "unsafely" set one half late (but before the resolver is actually used)
    this.resolver['options'] = this.compileOptions;
    this.registerHelper("if", ([cond, yes, no]) => cond ? yes : no);
    this.registerHelper("unless", ([cond, yes, no]) => cond ? no : yes);
    this.registerInternalHelper("-get-dynamic-var", getDynamicVar);
    this.registerModifier("action", new InertModifierManager());

    this.registerInternalHelper("hash", (_vm: VM, args: Arguments) => args.capture().named);
  }

  registerTemplate(name: string, source: string): { name: string, handle: number } {
    return { name, handle: this.resolver.register("template-source", name, source) };
  }

  registerBasicComponent(name: string, Component: BasicComponentFactory, layoutSource: string): void {
    if (name.indexOf('-') !== -1) {
      throw new Error("DEPRECATED: dasherized components");
    }

    let layout = this.registerTemplate(name, layoutSource);

    let definition = new BasicComponentDefinition(BASIC_COMPONENT_MANAGER, {
      name,
      layout: layout.handle,
      ComponentClass: Component
    });

    this.registerComponent(name, definition);
  }

  registerStaticTaglessComponent(name: string, Component: BasicComponentFactory, layoutSource: string): void {
    let layout = this.registerTemplate(name, layoutSource);

    let definition = new StaticTaglessComponentDefinition(STATIC_TAGLESS_COMPONENT_MANAGER, {
      name,
      layout: layout.handle,
      ComponentClass: Component
    });

    this.registerComponent(name, definition);
  }

  registerEmberishCurlyComponent(name: string, Component: Option<EmberishCurlyComponentFactory>, layoutSource: Option<string>): void {
    let layout: Option<{ name: string, handle: number }> = null;

    if (layoutSource !== null) {
      layout = this.registerTemplate(name, layoutSource);
    }

    let definition = new EmberishCurlyComponentDefinition(EMBERISH_CURLY_COMPONENT_MANAGER, {
      name,
      ComponentClass: Component || EmberishCurlyComponent,
      layout: layout && layout.handle
    });

    this.registerComponent(name, definition);
  }

  registerEmberishGlimmerComponent(name: string, Component: Option<EmberishGlimmerComponentFactory>, layoutSource: string): void {
    if (name.indexOf('-') !== -1) {
      throw new Error("DEPRECATED: dasherized components");
    }

    let layout = this.registerTemplate(name, layoutSource);

    let definition = new EmberishGlimmerComponentDefinition(EMBERISH_GLIMMER_COMPONENT_MANAGER, {
      name,
      ComponentClass: Component || EmberishGlimmerComponent,
      layout: layout.handle
    });

    this.registerComponent(name, definition);
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
    let definition = new PartialDefinition(name, this.compile(source, null));
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

  compile<TemplateMeta>(template: string, meta?: TemplateMeta): Template<TemplateMeta> {
    let wrapper = JSON.parse(precompile(template));
    let factory = templateFactory(wrapper);
    return factory.create(this.compileOptions, (meta || {}) as any as TemplateMeta);
  }

  private registerComponent(name: string, definition: ComponentDefinition) {
    console.log('register', name, definition);
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
