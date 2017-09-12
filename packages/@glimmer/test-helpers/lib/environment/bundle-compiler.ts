import { CompilerDelegate, Specifier, specifierFor, LookupMap, SpecifierMap, BundleCompiler, DebugConstants } from "@glimmer/bundle-compiler";
import { Dict, VMHandle, ProgramSymbolTable, Opaque, Option, RuntimeResolver as IRuntimeResolver, Recast } from "@glimmer/interfaces";
import { ComponentCapabilities, ICompilableTemplate, WrappedBuilder } from "@glimmer/opcode-compiler";
import { ComponentKind, RenderDelegate, renderSync } from '../abstract-test-case';
import { AbstractTestEnvironment, EnvironmentOptions } from './env';
import { ComponentManager, DOMTreeConstruction, DOMChanges, ComponentDefinition, getDynamicVar, Helper as GlimmerHelper, elementBuilder, TemplateIterator, RenderResult, Helper, LowLevelVM, Environment } from "@glimmer/runtime";
import { dict, assert, assign } from "@glimmer/util";
import { Program, RuntimeProgram, RuntimeConstants, WriteOnlyProgram } from "@glimmer/program";
import { BundlingBasicComponentManager, EMPTY_CAPABILITIES } from './components/basic';
import { TestDynamicScope } from '../environment';
import { UpdatableReference } from "@glimmer/object-reference";
import { HelperReference, UserHelper } from './helper';
import { TestMacros } from './generic/macros';
import { BundledEmberishGlimmerComponentManager, EmberishGlimmerComponent, EMBERISH_GLIMMER_CAPABILITIES } from './components/emberish-glimmer';
import { EMBERISH_CURLY_CAPABILITIES, EmberishCurlyComponent, BundledEmberishCurlyComponentManager } from './components/emberish-curly';
import * as SimpleDOM from 'simple-dom';
import { NodeEnv } from './ssr-env';

export interface RegisteredComponentDefinition {
  symbolTable?: boolean;
  name?: string;
  specifier?: Specifier;
  capabilities?: ComponentCapabilities;
  ComponentClass?: Opaque;
}

export interface CompileTimeComponent {
  type: ComponentKind;
  definition: RegisteredComponentDefinition;
  manager: ComponentManager<Opaque, Opaque>;
  template: string;
  capabilities: ComponentCapabilities;
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

  resolve(name: string, referrer: Specifier, defaultRoot?: string): Option<string> {
    let local = referrer.module && referrer.module.replace(/^((.*)\/)?([^\/]*)$/, `$1${name}`);
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

export class BundlingDelegate implements CompilerDelegate {
  constructor(private components: Dict<CompileTimeComponent>, private modules: Modules, private compileTimeModules: Modules, private compile: (specifier: Specifier) => VMHandle) {}

  hasComponentInScope(componentName: string, referrer: Specifier): boolean {
    let name = this.modules.resolve(componentName, referrer, 'ui/components');
    return name ? this.modules.type(name) === 'component' : false;
  }

  resolveComponentSpecifier(componentName: string, referrer: Specifier): Specifier {
    return specifierFor(this.modules.resolve(componentName, referrer, 'ui/components')!, 'default');
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

  hasHelperInScope(helperName: string, referrer: Specifier): boolean {
    let name = this.modules.resolve(helperName, referrer);
    return name ? this.modules.type(name) === 'helper' : false;
  }

  resolveHelperSpecifier(helperName: string, referrer: Specifier): Specifier {
    let path = this.modules.resolve(helperName, referrer);
    return specifierFor(path!, 'default');
  }

  hasModifierInScope(_modifierName: string, _referrer: Specifier): boolean {
    return false;
  }
  resolveModifierSpecifier(_modifierName: string, _referrer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
  hasPartialInScope(_partialName: string, _referrer: Specifier): boolean {
    return false;
  }
  resolvePartialSpecifier(_partialName: string, _referrer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
}

export class BundledClientEnvironment extends AbstractTestEnvironment<Opaque> {
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

export interface RuntimeComponentDefinition {
  symbolTable?: ProgramSymbolTable;
  name: string;
  specifier: Specifier;
  capabilities: ComponentCapabilities;
  ComponentClass: Opaque;
}

export class RuntimeResolver implements IRuntimeResolver<Specifier> {
  constructor(private map: SpecifierMap, private modules: Modules, public symbolTables: LookupMap<Specifier, ProgramSymbolTable>) {}

  lookupHelper(_name: string, _meta: Opaque): Option<number> {
    throw new Error("Method not implemented.");
  }
  lookupModifier(_name: string, _meta: Opaque): Option<number> {
    throw new Error("Method not implemented.");
  }

  lookupComponent(name: string, referrer: Specifier): Option<ComponentDefinition> {
    let moduleName = this.modules.resolve(name, referrer, 'ui/components');

    if (!moduleName) return null;

    let module = this.modules.get(moduleName);
    return module.get('default') as ComponentDefinition;
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

const BASIC_MANAGER = new BundlingBasicComponentManager();
const EMBERISH_GLIMMER_COMPONENT_MANAGER = new BundledEmberishGlimmerComponentManager();
const EMBERISH_CURLY_COMPONENT_MANAGER = new BundledEmberishCurlyComponentManager();

export class BundlingRenderDelegate implements RenderDelegate {
  protected env: Environment;
  protected modules = new Modules();
  protected compileTimeModules = new Modules();
  protected components = {};
  protected speficiersToSymbolTable = new LookupMap<Specifier, ProgramSymbolTable>();

  constructor(env: Environment) {
    this.env = env || new BundledClientEnvironment();
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
    let program = new WriteOnlyProgram(new DebugConstants());
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
        let parsedLayout = { block, referrer: spec };
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
          referrer: key,
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

    return renderSync(env, iterator);
  }
}

export class NodeBundlingRenderDelegate extends BundlingRenderDelegate {
  constructor(env = new NodeEnv({ document: new SimpleDOM.Document() })) {
    super(env);
  }
}
