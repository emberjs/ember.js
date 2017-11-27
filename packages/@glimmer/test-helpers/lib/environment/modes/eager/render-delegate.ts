import * as SimpleDOM from 'simple-dom';
import {
  Environment,
  ComponentDefinition,
  getDynamicVar,
  Helper as GlimmerHelper,
  RenderResult,
  LowLevelVM,
  TemplateIterator,
  ComponentManager,
  clientBuilder,
  ElementBuilder,
  Cursor
} from '@glimmer/runtime';
import { DebugConstants, BundleCompiler, ModuleLocatorMap, ModuleLocator } from '@glimmer/bundle-compiler';
import { Opaque, assert, Dict, assign, expect, Option } from '@glimmer/util';
import { WriteOnlyProgram, RuntimeProgram, RuntimeConstants, Heap } from '@glimmer/program';
import { ProgramSymbolTable, Recast, VMHandle, ComponentCapabilities } from '@glimmer/interfaces';
import { UpdatableReference } from '@glimmer/object-reference';

import RenderDelegate from '../../../render-delegate';
import EagerCompilerDelegate from './compiler-delegate';
import { ComponentKind, renderSync } from '../../../render-test';
import TestMacros from '../../macros';
import { UserHelper, HelperReference } from '../../helper';

import { BasicComponent, BasicComponentManager, BASIC_CAPABILITIES } from '../../components/basic';
import { EmberishCurlyComponent, EmberishCurlyComponentManager, EMBERISH_CURLY_CAPABILITIES } from '../../components/emberish-curly';
import { EmberishGlimmerComponent, EmberishGlimmerComponentManager, EMBERISH_GLIMMER_CAPABILITIES } from '../../components/emberish-glimmer';

import EagerTestEnvironment from './environment';
import EagerRuntimeResolver from './runtime-resolver';

import { Modules } from './modules';
import { TestDynamicScope } from '../../../environment';
import { WrappedBuilder } from '@glimmer/opcode-compiler';
import { NodeEnv } from '../ssr/environment';
import { TestComponentDefinitionState, locatorFor } from '../../component-definition';

export type RenderDelegateComponentDefinition = ComponentDefinition<TestComponentDefinitionState>;

type Entries<T> = { [F in ComponentKind]: Option<T> };

const COMPONENT_CLASSES: Entries<Opaque> = {
  Basic: BasicComponent,
  Glimmer: EmberishGlimmerComponent,
  Dynamic: EmberishCurlyComponent,
  Curly: EmberishCurlyComponent,
  Fragment: null
};

const COMPONENT_MANAGERS: Entries<ComponentManager<Opaque, Opaque>> = {
  Basic: new BasicComponentManager(),
  Glimmer: new EmberishGlimmerComponentManager(),
  Dynamic: new EmberishCurlyComponentManager(),
  Curly: new EmberishCurlyComponentManager(),
  Fragment: null
};

const COMPONENT_CAPABILITIES: Entries<ComponentCapabilities> = {
  Basic: BASIC_CAPABILITIES,
  Glimmer: EMBERISH_GLIMMER_CAPABILITIES,
  Dynamic: EMBERISH_CURLY_CAPABILITIES,
  Curly: EMBERISH_CURLY_CAPABILITIES,
  Fragment: null
};

export default class EagerRenderDelegate implements RenderDelegate {
  protected env: Environment;
  protected modules = new Modules();
  protected compileTimeModules = new Modules();
  protected components: Dict<ComponentDefinition<TestComponentDefinitionState>> = {};
  protected symbolTables = new ModuleLocatorMap<ProgramSymbolTable, ModuleLocator>();
  public constants: DebugConstants;

  constructor(env: Environment) {
    this.env = env || new EagerTestEnvironment();
    this.registerInternalHelper("-get-dynamic-var", getDynamicVar);
  }

  private registerInternalHelper(name: string, helper: GlimmerHelper): GlimmerHelper {
    this.modules.register(name, 'helper', { default: helper });
    return helper;
  }

  getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder {
    return clientBuilder(env, cursor);
  }

  resetEnv() {
    this.env = new EagerTestEnvironment();
  }

  getInitialElement(): HTMLElement {
    return this.env.getAppendOperations().createElement('div') as HTMLElement;
  }

  registerComponent(type: ComponentKind, testType: ComponentKind, name: string, template: string, Class?: Opaque): void {
    let module = `ui/components/${name}`;

    let ComponentClass = Class || COMPONENT_CLASSES[type];
    let manager = COMPONENT_MANAGERS[type];
    let capabilities = COMPONENT_CAPABILITIES[type];

    if (!manager || !capabilities) {
      throw new Error(`Not implemented in the Bundle Compiler yet: ${type}`);
    }

    let hasSymbolTable = testType === 'Dynamic';

    let state: TestComponentDefinitionState = {
      name,
      type,
      template,
      capabilities,
      hasSymbolTable,
      ComponentClass,
      locator: locatorFor({ module, name: 'default' }),
      // Populated by the Bundle Compiler in eager mode
      layout: null
    };

    this.components[module] = {
      manager,
      state
    };
  }

  getSelf(context: Opaque) {
    return new UpdatableReference(context);
  }

  registerHelper(name: string, helper: UserHelper): void {
    let glimmerHelper: GlimmerHelper = (_vm, args) => new HelperReference(helper, args);
    this.modules.register(name, 'helper', { default: glimmerHelper });
  }

  renderTemplate(template: string, context: Dict<Opaque>, element: HTMLElement): RenderResult {
    let macros = new TestMacros();
    let delegate: EagerCompilerDelegate = new EagerCompilerDelegate(this.components, this.modules);
    this.constants = new DebugConstants();
    let program = new WriteOnlyProgram(this.constants);
    let compiler = new BundleCompiler(delegate, { macros, program });

    let locator = locatorFor({ module: 'ui/components/main', name: 'default' });
    compiler.add(locator, template);

    let { components, modules, compileTimeModules } = this;
    Object.keys(components).forEach(key => {
      assert(key.indexOf('ui/components') !== -1, `Expected component key to start with ui/components, got ${key}.`);

      let { state, manager } = components[key];

      let locator = locatorFor({ module: key, name: 'default' });

      let block;
      let symbolTable;

      if (state.type === "Curly" || state.type === "Dynamic") {
        let block = compiler.preprocess(locator.meta, state.template!);
        let options = compiler.compileOptions(locator);
        let parsedLayout = { block, referrer: locator.meta };
        let wrapped = new WrappedBuilder(options, parsedLayout, EMBERISH_CURLY_CAPABILITIES);
        compiler.addCompilableTemplate(locator, wrapped);

        compileTimeModules.register(key, 'other', {
          default: wrapped.symbolTable
        });

        symbolTable = wrapped.symbolTable;
      } else {
        block = compiler.add(locator, expect(state.template, 'expected component definition state to have template'));
        symbolTable = {
          hasEval: block.hasEval,
          symbols: block.symbols,
          referrer: key,
        };

        this.symbolTables.set(locator, symbolTable);

        compileTimeModules.register(key, 'other', {
          default: symbolTable
        });
      }

      if (state.hasSymbolTable) {
        modules.register(key, 'component', {
          default: {
            state: assign({}, state, { symbolTable }),
            manager
          }
        });
      } else {
        modules.register(key, 'component', {
          default: {
            state,
            manager
          }
        });
      }
    });

    let { heap, pool, table } = compiler.compile();

    let handle = table.vmHandleByModuleLocator.get(locator)! as Recast<number, VMHandle>;
    let { env } = this;

    let cursor = { element, nextSibling: null };
    let builder = this.getElementBuilder(env, cursor);
    let self = this.getSelf(context);
    let dynamicScope = new TestDynamicScope();
    let resolver = new EagerRuntimeResolver(table, this.modules, this.symbolTables);
    let runtimeHeap = new Heap(heap);
    let runtimeProgram = new RuntimeProgram(new RuntimeConstants(resolver, pool), runtimeHeap);

    let vm = LowLevelVM.initial(runtimeProgram, env, self, null, dynamicScope, builder, handle);
    let iterator = new TemplateIterator(vm);

    return renderSync(env, iterator);
  }
}

export class NodeRenderDelegate extends EagerRenderDelegate {
  constructor(env = new NodeEnv({ document: new SimpleDOM.Document() })) {
    super(env);
  }
}
