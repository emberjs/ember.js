import {
  Environment,
  ComponentDefinition,
  getDynamicVar,
  Helper as GlimmerHelper,
  RenderResult,
  elementBuilder,
  LowLevelVM,
  TemplateIterator,
  ComponentManager
} from '@glimmer/runtime';
import { LookupMap, specifierFor, DebugConstants, BundleCompiler, Specifier } from '@glimmer/bundle-compiler';
import { Opaque, assert, Dict, assign, expect, Option } from '@glimmer/util';

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
import { WriteOnlyProgram, RuntimeProgram, RuntimeConstants } from '@glimmer/program';
import { WrappedBuilder } from '@glimmer/opcode-compiler';
import { ProgramSymbolTable, Recast, VMHandle, ComponentCapabilities } from '@glimmer/interfaces';
import { UpdatableReference } from '@glimmer/object-reference';
import { NodeEnv } from '../ssr/environment';
import * as SimpleDOM from 'simple-dom';
import { TestComponentDefinitionState } from '../../component-definition';

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
  protected specifiersToSymbolTable = new LookupMap<Specifier, ProgramSymbolTable>();

  constructor(env: Environment) {
    this.env = env || new EagerTestEnvironment();
    this.registerInternalHelper("-get-dynamic-var", getDynamicVar);
  }

  private registerInternalHelper(name: string, helper: GlimmerHelper): GlimmerHelper {
    this.modules.register(name, 'helper', { default: helper });
    return helper;
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

    let specifier = specifierFor(`ui/components/${name}`, 'default');
    let hasSymbolTable = testType === 'Dynamic';

    let state: TestComponentDefinitionState = {
      name,
      type,
      specifier,
      template,
      capabilities,
      hasSymbolTable,
      ComponentClass,
      // Populated by the Bundle Compiler in eager mode
      layout: null
    };

    this.components[module] = {
      manager,
      state
    };
  }

  registerHelper(name: string, helper: UserHelper): void {
    let glimmerHelper: GlimmerHelper = (_vm, args) => new HelperReference(helper, args);
    this.modules.register(name, 'helper', { default: glimmerHelper });
  }

  renderTemplate(template: string, context: Dict<Opaque>, element: HTMLElement): RenderResult {
    let macros = new TestMacros();
    let delegate: EagerCompilerDelegate = new EagerCompilerDelegate(this.components, this.modules, this.compileTimeModules, specifier => {
      return compiler.compileSpecifier(specifier);
    });
    let program = new WriteOnlyProgram(new DebugConstants());
    let compiler = new BundleCompiler(delegate, { macros, program });

    let spec = specifierFor('ui/components/main', 'default');
    compiler.add(spec, template);

    let { components, modules, compileTimeModules } = this;
    Object.keys(components).forEach(key => {
      assert(key.indexOf('ui/components') !== -1, `Expected component key to start with ui/components, got ${key}.`);

      let { state, manager } = components[key];

      let spec = specifierFor(key, 'default');

      let block;
      let symbolTable;

      if (state.type === "Curly" || state.type === "Dynamic") {
        let block = compiler.preprocess(spec, state.template!);
        let options = compiler.compileOptions(spec);
        let parsedLayout = { block, referrer: spec };
        let wrapped = new WrappedBuilder(options, parsedLayout, EMBERISH_CURLY_CAPABILITIES);
        compiler.addCustom(spec, wrapped);

        compileTimeModules.register(key, 'other', {
          default: wrapped.symbolTable
        });

        symbolTable = wrapped.symbolTable;
      } else {
        block = compiler.add(spec, expect(state.template, 'expected component definition state to have template'));

        symbolTable = {
          hasEval: block.hasEval,
          symbols: block.symbols,
          referrer: key,
        };

        this.specifiersToSymbolTable.set(spec, symbolTable);

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

    compiler.compile();

    let handle = compiler.getSpecifierMap().vmHandleBySpecifier.get(spec)! as Recast<number, VMHandle>;
    let { env } = this;

    let cursor = { element, nextSibling: null };
    let builder = elementBuilder({ mode: 'client', env, cursor });
    let self = new UpdatableReference(context);
    let dynamicScope = new TestDynamicScope();
    let resolver = new EagerRuntimeResolver(compiler.getSpecifierMap(), this.modules, this.specifiersToSymbolTable);
    let pool = program.constants.toPool();
    let runtimeProgram = new RuntimeProgram(new RuntimeConstants(resolver, pool), program.heap);

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
