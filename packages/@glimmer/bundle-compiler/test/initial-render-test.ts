import { Opaque, RuntimeResolver as IRuntimeResolver, Option, Dict, Recast, Simple, ProgramSymbolTable } from "@glimmer/interfaces";
import {
  TestDynamicScope,
  UserHelper,
  HelperReference,
  TestMacros,
  RenderDelegate,
  InitialRenderSuite,
  BasicComponents,
  AbstractTestEnvironment,
  renderSync,
  EmberishComponentTests,
  AbstractEmberishGlimmerComponentManager,
  rawModule,
  EmberishGlimmerComponent,
  EnvironmentOptions,
  EmberishCurlyComponent,
  ComponentKind,
  AbstractEmberishCurlyComponentManager,
  HasBlockSuite,
  DebuggerSuite,
  HasBlockParamsHelperSuite,
  InElementSuite,
  ScopeSuite,
  ShadowingSuite,
  WithDynamicVarsSuite,
  YieldSuite
} from "@glimmer/test-helpers";
import { BundleCompiler, CompilerDelegate, Specifier, SpecifierMap, specifierFor, LookupMap } from "@glimmer/bundle-compiler";
import { WrappedBuilder, ComponentCapabilities, VMHandle, ICompilableTemplate } from "@glimmer/opcode-compiler";
import { Program, RuntimeProgram, WriteOnlyConstants, WriteOnlyProgram, RuntimeConstants } from "@glimmer/program";
import { elementBuilder, LowLevelVM, TemplateIterator, RenderResult, Helper, Environment, WithStaticLayout, Bounds, ComponentManager, DOMTreeConstruction, DOMChanges, ComponentSpec, Invocation, getDynamicVar, Helper as GlimmerHelper, } from "@glimmer/runtime";
import { UpdatableReference } from "@glimmer/object-reference";
import { dict, unreachable, assert, assign } from "@glimmer/util";
import { PathReference, CONSTANT_TAG, Tag } from "@glimmer/reference";

class BundledClientEnvironment extends AbstractTestEnvironment<Opaque> {
  protected program: Program<Opaque>;
  protected resolver: IRuntimeResolver<Opaque>;

  constructor(options?: EnvironmentOptions) {
    if (!options) {
      let document = window.document;
      let appendOperations = new DOMTreeConstruction(document);
      let updateOperations = new DOMChanges(document as HTMLDocument);
      options = { appendOperations, updateOperations };
    }

    super(options);
  }
}

export class RuntimeResolver implements IRuntimeResolver<Specifier> {
  constructor(private map: SpecifierMap, private modules: Modules, public symbolTables: LookupMap<Specifier, ProgramSymbolTable>) {}

  lookupHelper(_name: string, _meta: Opaque): Option<number> {
    throw new Error("Method not implemented.");
  }
  lookupModifier(_name: string, _meta: Opaque): Option<number> {
    throw new Error("Method not implemented.");
  }

  lookupComponent(name: string, referer: Specifier): Option<ComponentSpec> {
    let moduleName = this.modules.resolve(name, referer, 'ui/components');

    if (!moduleName) return null;

    let module = this.modules.get(moduleName);
    return module.get('default') as ComponentSpec;
  }

  lookupPartial(_name: string, _meta: Opaque): Option<number> {
    throw new Error("Method not implemented.");
  }

  resolve<U>(specifier: number): U {
    let module = this.map.byHandle.get(specifier)!;
    return this.modules.get(module.module).get('default') as U;
  }

  getVMHandle(specifier: Specifier): number {
    return this.map.vmHandleBySpecifier.get(specifier) as Recast<VMHandle, number>;
  }
}

export type ModuleType = 'component' | 'helper' | 'modifier' | 'partial' | 'other';

export class Module {
  constructor(private dict: Dict<Opaque>, public type: ModuleType) {
    Object.freeze(this.dict);
  }

  has(key: string) {
    return key in this.dict;
  }

  get(key: string): Opaque {
    return this.dict[key];
  }
}

export class Modules {
  private registry = dict<Module>();

  has(name: string): boolean {
    return name in this.registry;
  }

  get(name: string): Module {
    return this.registry[name];
  }

  type(name: string): ModuleType {
    let module = this.registry[name];
    return module.type;
  }

  register(name: string, type: ModuleType, value: Dict<Opaque>) {
    assert(name.indexOf('ui/components/ui') === -1, `BUG: ui/components/ui shouldn't be a prefix`);
    assert(!name.match(/^[A-Z]/), 'BUG: Components should be nested under ui/components');
    this.registry[name] = new Module(value, type);
  }

  resolve(name: string, referer: Specifier, defaultRoot?: string): Option<string> {
    let local = referer.module && referer.module.replace(/^((.*)\/)?([^\/]*)$/, `$1${name}`);
    if (local && this.registry[local]) {
      return local;
    } else if (defaultRoot && this.registry[`${defaultRoot}/${name}`]) {
      return `${defaultRoot}/${name}`;
    } else if (this.registry[name]) {
      return name;
    } else {
      return null;
    }
  }
}

class BundlingDelegate implements CompilerDelegate {
  constructor(private components: Dict<CompileTimeComponent>, private modules: Modules, private compileTimeModules: Modules, private compile: (specifier: Specifier) => VMHandle) {}

  hasComponentInScope(componentName: string, referer: Specifier): boolean {
    let name = this.modules.resolve(componentName, referer, 'ui/components');
    return name ? this.modules.type(name) === 'component' : false;
  }

  resolveComponentSpecifier(componentName: string, referer: Specifier): Specifier {
    return specifierFor(this.modules.resolve(componentName, referer, 'ui/components')!, 'default');
  }

  getComponentCapabilities(specifier: Specifier): ComponentCapabilities {
    return this.components[specifier.module].capabilities;
  }

  getComponentLayout(specifier: Specifier): ICompilableTemplate<ProgramSymbolTable> {
    let compile = this.compile;
    let module = this.compileTimeModules.get(specifier.module)!;
    let table = module.get(specifier.name) as ProgramSymbolTable;

    return {
      symbolTable: table,
      compile(): VMHandle {
        return compile(specifier);
      }
    };
  }

  hasHelperInScope(helperName: string, referer: Specifier): boolean {
    let name = this.modules.resolve(helperName, referer);
    return name ? this.modules.type(name) === 'helper' : false;
  }

  resolveHelperSpecifier(helperName: string, referer: Specifier): Specifier {
    let path = this.modules.resolve(helperName, referer);
    return specifierFor(path!, 'default');
  }

  hasModifierInScope(_modifierName: string, _referer: Specifier): boolean {
    return false;
  }
  resolveModifierSpecifier(_modifierName: string, _referer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
  hasPartialInScope(_partialName: string, _referer: Specifier): boolean {
    return false;
  }
  resolvePartialSpecifier(_partialName: string, _referer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
}

export class BasicComponent {
  public element: Option<Simple.Element>;
  public bounds: Option<Bounds>;
}

const EMPTY_CAPABILITIES = {
  staticDefinitions: true,
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false
};

export class BasicComponentManager implements WithStaticLayout<BasicComponent, { specifier: Specifier }, Specifier, RuntimeResolver> {
  getCapabilities(_definition: { specifier: Specifier }) {
    return EMPTY_CAPABILITIES;
  }

  prepareArgs(): null {
    throw unreachable();
  }

  create(_env: Environment, _definition: Opaque): BasicComponent {
    let klass = BasicComponent;
    return new klass();
  }

  getLayout(definition: { specifier: Specifier }, resolver: RuntimeResolver): Invocation {
    let handle = resolver.getVMHandle(definition.specifier);
    let symbolTable = resolver.symbolTables.get(definition.specifier)!;
    return {
      handle: handle as Recast<number, VMHandle>,
      symbolTable
    };
  }

  getSelf(component: BasicComponent): PathReference<Opaque> {
    return new UpdatableReference(component);
  }

  getTag(): Tag {
    return CONSTANT_TAG;
  }

  didCreateElement(component: BasicComponent, element: Element): void {
    component.element = element;
  }

  didRenderLayout(component: BasicComponent, bounds: Bounds): void {
    component.bounds = bounds;
  }

  didCreate(): void { }

  update(): void { }

  didUpdateLayout(): void { }

  didUpdate(): void { }

  getDestructor(): null {
    return null;
  }
}

class BundledEmberishGlimmerComponentManager extends AbstractEmberishGlimmerComponentManager<Specifier, RuntimeResolver> {
  getLayout(): Invocation {
    throw unreachable();
  }
}

class BundledEmberishCurlyComponentManager extends AbstractEmberishCurlyComponentManager {
  getLayout(definition: RuntimeComponentDefinition, resolver: RuntimeResolver): Invocation {
    let handle = resolver.getVMHandle(definition.specifier);
    return {
      handle: handle as Recast<number, VMHandle>,
      symbolTable: definition.symbolTable!
    };
  }
}

const BASIC_MANAGER = new BasicComponentManager();
const EMBERISH_GLIMMER_COMPONENT_MANAGER = new BundledEmberishGlimmerComponentManager();

const EMBERISH_GLIMMER_CAPABILITIES = {
  ...EMPTY_CAPABILITIES,
  staticDefinitions: false,
  dynamicTag: true,
  createArgs: true,
  attributeHook: true
};

const EMBERISH_CURLY_COMPONENT_MANAGER = new BundledEmberishCurlyComponentManager();
const EMBERISH_CURLY_CAPABILITIES = {
  staticDefinitions: true,
  dynamicLayout: false,
  dynamicTag: true,
  prepareArgs: true,
  createArgs: true,
  attributeHook: false,
  elementHook: true
};

interface RegisteredComponentDefinition {
  symbolTable?: boolean;
  name?: string;
  specifier?: Specifier;
  capabilities?: ComponentCapabilities;
  ComponentClass?: Opaque;
}

export interface RuntimeComponentDefinition {
  symbolTable?: ProgramSymbolTable;
  name: string;
  specifier: Specifier;
  capabilities: ComponentCapabilities;
  ComponentClass: Opaque;
}

interface CompileTimeComponent {
  type: ComponentKind;
  definition: RegisteredComponentDefinition;
  manager: ComponentManager<Opaque, Opaque>;
  template: string;
  capabilities: ComponentCapabilities;
}

class BundlingRenderDelegate implements RenderDelegate {
  protected env = new BundledClientEnvironment();
  protected modules = new Modules();
  protected compileTimeModules = new Modules();
  protected components = dict<CompileTimeComponent>();
  protected speficiersToSymbolTable = new LookupMap<Specifier, ProgramSymbolTable>();

  constructor() {
    this.registerInternalHelper("-get-dynamic-var", getDynamicVar);
  }

  private registerInternalHelper(name: string, helper: GlimmerHelper): GlimmerHelper {
    this.modules.register(name, 'helper', { default: helper });
    return helper;
  }

  resetEnv() {
    this.env = new BundledClientEnvironment();
  }

  getInitialElement(): HTMLElement {
    return this.env.getAppendOperations().createElement('div') as HTMLElement;
  }

  registerComponent(type: ComponentKind, testType: ComponentKind, name: string, layout: string, Class?: Opaque): void {
    let module = `ui/components/${name}`;

    switch (type) {
      case "Basic":
        class Basic {
          static specifier = specifierFor(`ui/components/${name}`, 'default');
        }
        this.components[module] = {
          type,
          definition: Basic as RegisteredComponentDefinition,
          manager: BASIC_MANAGER,
          capabilities: EMPTY_CAPABILITIES,
          template: layout
        };
        return;
      case "Glimmer":
        this.components[module] = {
          type,
          definition: {
            name,
            specifier: specifierFor(`ui/components/${name}`, 'default'),
            capabilities: EMBERISH_GLIMMER_CAPABILITIES,
            ComponentClass: Class || EmberishGlimmerComponent
          },
          capabilities: EMBERISH_GLIMMER_CAPABILITIES,
          manager: EMBERISH_GLIMMER_COMPONENT_MANAGER,
          template: layout
        };
        return;
      case "Dynamic":
      case "Curly":
        this.components[module] = {
          type,
          definition: {
            name,
            symbolTable: testType === 'Dynamic',
            specifier: specifierFor(`ui/components/${name}`, 'default'),
            capabilities: EMBERISH_CURLY_CAPABILITIES,
            ComponentClass: Class || EmberishCurlyComponent
          },
          capabilities: EMBERISH_CURLY_CAPABILITIES,
          manager: EMBERISH_CURLY_COMPONENT_MANAGER,
          template: layout
        };
        return;
      default:
        throw new Error(`Not implemented in the Bundle Compiler yet: ${type}`);
    }
  }

  registerHelper(name: string, helper: UserHelper): void {
    let glimmerHelper: Helper = (_vm, args) => new HelperReference(helper, args);

    this.modules.register(name, 'helper', { default: glimmerHelper });
  }

  renderTemplate(template: string, context: Dict<Opaque>, element: HTMLElement): RenderResult {
    let macros = new TestMacros();
    let delegate: BundlingDelegate = new BundlingDelegate(this.components, this.modules, this.compileTimeModules, specifier => {
      return compiler.compileSpecifier(specifier);
    });
    let program = new WriteOnlyProgram(new WriteOnlyConstants());
    let compiler = new BundleCompiler(delegate, { macros, program });

    let spec = specifierFor('ui/components/main', 'default');
    compiler.add(spec, template);

    let { components, modules, compileTimeModules } = this;
    Object.keys(components).forEach(key => {
      assert(key.indexOf('ui/components') !== -1, `Expected component key to start with ui/components, got ${key}.`);

      let component = components[key];
      let spec = specifierFor(key, 'default');

      let block;
      let symbolTable;

      if (component.type === "Curly" || component.type === "Dynamic") {
        let block = compiler.preprocess(spec, component.template);
        let options = compiler.compileOptions(spec);
        let parsedLayout = { block, referer: spec };
        let wrapped = new WrappedBuilder(options, parsedLayout, EMBERISH_CURLY_CAPABILITIES);
        compiler.addCustom(spec, wrapped);

        compileTimeModules.register(key, 'other', {
          default: wrapped.symbolTable
        });

        symbolTable = wrapped.symbolTable;
      } else {
        block = compiler.add(spec, component.template);

        symbolTable = {
          hasEval: block.hasEval,
          symbols: block.symbols,
          referer: key,
        };

        this.speficiersToSymbolTable.set(spec, symbolTable);

        compileTimeModules.register(key, 'other', {
          default: symbolTable
        });
      }

      if (component.definition.symbolTable) {
        modules.register(key, 'component', {
          default: {
            definition: assign({}, component.definition, { symbolTable }),
            manager: component.manager
          }
        });
      } else {
        modules.register(key, 'component', { default: { definition: component.definition, manager: component.manager } });
      }
    });

    compiler.compile();

    let handle = compiler.getSpecifierMap().vmHandleBySpecifier.get(spec)! as Recast<number, VMHandle>;
    let { env } = this;

    let cursor = { element, nextSibling: null };
    let builder = elementBuilder({ mode: 'client', env, cursor });
    let self = new UpdatableReference(context);
    let dynamicScope = new TestDynamicScope();
    let resolver = new RuntimeResolver(compiler.getSpecifierMap(), this.modules, this.speficiersToSymbolTable);
    let pool = program.constants.toPool();
    let runtimeProgram = new RuntimeProgram(new RuntimeConstants(resolver, pool), program.heap);

    let vm = LowLevelVM.initial(runtimeProgram, env, self, null, dynamicScope, builder, handle);
    let iterator = new TemplateIterator(vm);

    return renderSync(env, iterator);  }
}

// module("[Bundle Compiler] Rehydration Tests", Rehydration);
rawModule("[Bundle Compiler] Initial Render Tests", InitialRenderSuite, BundlingRenderDelegate);
rawModule("[Bundle Compiler] Basic Components", BasicComponents, BundlingRenderDelegate, { componentModule: true });
rawModule('[Bundle Compiler] Emberish Components', EmberishComponentTests, BundlingRenderDelegate, { componentModule: true });
rawModule('[Bundle Compiler] Has Block', HasBlockSuite, BundlingRenderDelegate, { componentModule: true });
rawModule('[Bundle Compiler] Debugger Tests', DebuggerSuite, BundlingRenderDelegate);
rawModule('[Bundle Compiler] Has Block Params Helpers Tests', HasBlockParamsHelperSuite, BundlingRenderDelegate, { componentModule: true });
rawModule('[Bundle Compiler] In-Element Tests', InElementSuite, BundlingRenderDelegate);
rawModule('[Bundle Compiler] Scope Tests', ScopeSuite, BundlingRenderDelegate, { componentModule: true });
rawModule('[Bundle Compiler] Shadowing Tests', ShadowingSuite, BundlingRenderDelegate, { componentModule: true });
rawModule('[Bundle Compiler] With Dynamic Vars Tests', WithDynamicVarsSuite, BundlingRenderDelegate, { componentModule: true });
rawModule('[Bundle Compiler] Yield Tests', YieldSuite, BundlingRenderDelegate, { componentModule: true });
