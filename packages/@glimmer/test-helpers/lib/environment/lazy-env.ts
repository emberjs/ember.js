import { GenericComponentDefinition } from './shared';
import { BasicComponentFactory, BasicComponentDefinition, BASIC_COMPONENT_MANAGER, StaticTaglessComponentDefinition, STATIC_TAGLESS_COMPONENT_MANAGER, EmberishCurlyComponentFactory, EmberishCurlyComponentDefinition, EMBERISH_CURLY_COMPONENT_MANAGER, EmberishGlimmerComponentFactory, EmberishCurlyComponent, EmberishGlimmerComponentDefinition, EMBERISH_GLIMMER_COMPONENT_MANAGER, EmberishGlimmerComponent } from './components';
import { AbstractTestEnvironment } from './env';
import { UserHelper, HelperReference } from './helper';
import { InertModifierManager } from './modifier';
import { TestMacros } from './generic/macros';
import { Option, RuntimeResolver, Opaque, Maybe, Simple } from "@glimmer/interfaces";
import { Helper as GlimmerHelper, DOMTreeConstruction, TopLevelSyntax, ModifierManager, PartialDefinition, ComponentSpec, CompilationOptions, templateFactory, Template, IDOMChanges, DOMChanges, VM, Arguments, getDynamicVar, CurriedComponentDefinition, curry, Invocation } from "@glimmer/runtime";
import { TemplateOptions, LazyOpcodeBuilder, OpcodeBuilderConstructor } from "@glimmer/opcode-compiler";
import { dict } from "@glimmer/util";
import { precompile } from "@glimmer/compiler";
import { LazyConstants, Program } from "@glimmer/program";
import { LookupResolver } from "./lookup";

export interface TestSpecifier<T extends LookupType = LookupType> {
  type: T;
  name: string;
}

export interface TestEnvironmentOptions {
  document?: Simple.Document;
  appendOperations?: DOMTreeConstruction;
  updateOperations?: IDOMChanges;
  program?: TopLevelSyntax;
}

export interface Lookup {
  helper: GlimmerHelper;
  modifier: ModifierManager;
  partial: PartialDefinition;
  component: ComponentSpec;
  template: Invocation;
  'template-source': string;
}

export type LookupType = keyof Lookup;
export type LookupValue = Lookup[LookupType];

class TypedRegistry<T> {
  private byName: { [key: string]: number } = dict<number>();
  private byHandle: { [key: number]: T } = dict<T>();

  hasName(name: string): boolean {
    return name in this.byName;
  }

  getHandle(name: string): Option<number> {
    return this.byName[name];
  }

  hasHandle(name: number): boolean {
    return name in this.byHandle;
  }

  getByHandle(handle: number): Option<T> {
    return this.byHandle[handle];
  }

  register(handle: number, name: string, value: T): void {
    this.byHandle[handle] = value;
    this.byName[name] = handle;
  }
}

export type TestCompilationOptions = CompilationOptions<TestSpecifier, TestResolver>;

export class TestResolver implements RuntimeResolver<TestSpecifier> {
  private handleLookup: TypedRegistry<Opaque>[] = [];

  private registry = {
    helper: new TypedRegistry<GlimmerHelper>(),
    modifier: new TypedRegistry<ModifierManager>(),
    partial: new TypedRegistry<PartialDefinition>(),
    component: new TypedRegistry<ComponentSpec>(),
    template: new TypedRegistry<Invocation>(),
    'template-source': new TypedRegistry<string>()
  };

  private options: TemplateOptions<TestSpecifier>;

  register<K extends LookupType>(type: K, name: string, value: Lookup[K]): number {
    let registry = this.registry[type];
    let handle = this.handleLookup.length;
    this.handleLookup.push(registry);
    (this.registry[type] as TypedRegistry<any>).register(handle, name, value);
    return handle;
  }

  lookup(type: LookupType, name: string, _referrer?: TestSpecifier): Option<number> {
    if (this.registry[type].hasName(name)) {
      return this.registry[type].getHandle(name);
    } else {
      return null;
    }
  }

  compileTemplate(sourceHandle: number, templateName: string, create: (source: string, options: TemplateOptions<TestSpecifier>) => Invocation): Invocation {
    let invocationHandle = this.lookup('template', templateName);

    if (invocationHandle) {
      return this.resolve<Invocation>(invocationHandle);
    }

    let source = this.resolve<string>(sourceHandle);

    let invocation = create(source, this.options);
    this.register('template', templateName, invocation);
    return invocation;
  }

  lookupHelper(name: string, referrer?: TestSpecifier): Option<number> {
    return this.lookup('helper', name, referrer);
  }

  lookupModifier(name: string, referrer?: TestSpecifier): Option<number> {
    return this.lookup('modifier', name, referrer);
  }

  lookupComponent(name: string, referrer?: TestSpecifier): Option<ComponentSpec> {
    let handle = this.lookupComponentHandle(name, referrer);
    if (handle === null) return null;
    return this.resolve(handle) as ComponentSpec;
  }

  lookupComponentHandle(name: string, referrer?: TestSpecifier): Option<number> {
    return this.lookup('component', name, referrer);
  }

  lookupPartial(name: string, referrer?: TestSpecifier): Option<number> {
    return this.lookup('partial', name, referrer);
  }

  resolve<T>(handle: number): T {
    let registry = this.handleLookup[handle];
    return registry.getByHandle(handle) as T;
  }
}

export class TestEnvironment extends AbstractTestEnvironment<TestSpecifier> {
  public resolver = new TestResolver();
  protected program = new Program(new LazyConstants(this.resolver));

  public compileOptions: TemplateOptions<TestSpecifier> = {
    lookup: new LookupResolver(this.resolver),
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
    let definition = new BasicComponentDefinition(name, BASIC_COMPONENT_MANAGER, Component, layout.handle);
    this.registerComponent(name, definition);
  }

  registerStaticTaglessComponent(name: string, Component: BasicComponentFactory, layoutSource: string): void {
    let layout = this.registerTemplate(name, layoutSource);

    let definition = new StaticTaglessComponentDefinition(name, STATIC_TAGLESS_COMPONENT_MANAGER, Component, layout.handle);
    this.registerComponent(name, definition);
  }

  registerEmberishCurlyComponent(name: string, Component: Option<EmberishCurlyComponentFactory>, layoutSource: Option<string>): void {
    let layout: Option<{ name: string, handle: number }> = null;

    if (layoutSource !== null) {
      layout = this.registerTemplate(name, layoutSource);
    }

    let definition = new EmberishCurlyComponentDefinition(name, EMBERISH_CURLY_COMPONENT_MANAGER, Component || EmberishCurlyComponent, layout && layout.handle);
    this.registerComponent(name, definition);
  }

  registerEmberishGlimmerComponent(name: string, Component: Option<EmberishGlimmerComponentFactory>, layoutSource: string): void {
    if (name.indexOf('-') !== -1) {
      throw new Error("DEPRECATED: dasherized components");
    }

    let layout = this.registerTemplate(name, layoutSource);

    let definition = new EmberishGlimmerComponentDefinition(name, EMBERISH_GLIMMER_COMPONENT_MANAGER, Component || EmberishGlimmerComponent, layout.handle);
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

    let spec = this.resolver.resolve<ComponentSpec>(handle);
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

  private registerComponent(name: string, definition: GenericComponentDefinition<any>) {
    this.resolver.register('component', name, { definition, manager: definition.manager });
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
