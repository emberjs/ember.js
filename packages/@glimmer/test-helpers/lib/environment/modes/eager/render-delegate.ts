import {
  Environment,
  ComponentDefinition,
  getDynamicVar,
  Helper as GlimmerHelper,
  RenderResult,
  ComponentManager,
  clientBuilder,
  ElementBuilder,
  Cursor,
  renderMain,
  renderComponent,
} from '@glimmer/runtime';
import {
  DebugConstants,
  BundleCompiler,
  ModuleLocatorMap,
  BundleCompilationResult,
} from '@glimmer/bundle-compiler';
import { WrappedBuilder } from '@glimmer/opcode-compiler';
import { Opaque, assert, Dict, assign, expect, Option } from '@glimmer/util';
import { WriteOnlyProgram, RuntimeProgram, RuntimeConstants, Heap } from '@glimmer/program';
import {
  ProgramSymbolTable,
  ComponentCapabilities,
  ModuleLocator,
  Simple,
} from '@glimmer/interfaces';
import { PathReference } from '@glimmer/reference';
import { UpdatableReference } from '@glimmer/object-reference';
import createHTMLDocument from '@simple-dom/document';

import RenderDelegate from '../../../render-delegate';
import EagerCompilerDelegate from './compiler-delegate';
import { ComponentKind, renderSync } from '../../../render-test';
import TestMacros from '../../macros';
import { UserHelper, HelperReference } from '../../helper';

import { BasicComponent, BasicComponentManager, BASIC_CAPABILITIES } from '../../components/basic';
import {
  EmberishCurlyComponent,
  EmberishCurlyComponentManager,
  EMBERISH_CURLY_CAPABILITIES,
} from '../../components/emberish-curly';
import {
  EmberishGlimmerComponent,
  EmberishGlimmerComponentManager,
  EMBERISH_GLIMMER_CAPABILITIES,
} from '../../components/emberish-glimmer';

import EagerTestEnvironment from './environment';
import EagerRuntimeResolver from './runtime-resolver';

import { Modules } from './modules';
import { TestDynamicScope } from '../../../environment';
import { NodeEnv } from '../ssr/environment';
import { TestComponentDefinitionState, locatorFor } from '../../component-definition';
import {
  TestModifierDefinitionState,
  TestModifierConstructor,
  TestModifierManager,
} from '../../modifier';
import { Locator } from '../../components';

export type RenderDelegateComponentDefinition = ComponentDefinition<TestComponentDefinitionState>;

type Entries<T> = { [F in ComponentKind]: Option<T> };

const COMPONENT_CLASSES: Entries<Opaque> = {
  Basic: BasicComponent,
  Glimmer: EmberishGlimmerComponent,
  Dynamic: EmberishCurlyComponent,
  Curly: EmberishCurlyComponent,
  Fragment: null,
};

const COMPONENT_MANAGERS: Entries<ComponentManager<Opaque, Opaque>> = {
  Basic: new BasicComponentManager(),
  Glimmer: new EmberishGlimmerComponentManager(),
  Dynamic: new EmberishCurlyComponentManager(),
  Curly: new EmberishCurlyComponentManager(),
  Fragment: null,
};

const COMPONENT_CAPABILITIES: Entries<ComponentCapabilities> = {
  Basic: BASIC_CAPABILITIES,
  Glimmer: EMBERISH_GLIMMER_CAPABILITIES,
  Dynamic: EMBERISH_CURLY_CAPABILITIES,
  Curly: EMBERISH_CURLY_CAPABILITIES,
  Fragment: null,
};

export default class EagerRenderDelegate implements RenderDelegate {
  protected env: Environment;
  protected modules = new Modules();
  protected compileTimeModules = new Modules();
  protected components: Dict<ComponentDefinition<TestComponentDefinitionState>> = {};
  protected symbolTables = new ModuleLocatorMap<ProgramSymbolTable, ModuleLocator>();
  public constants!: DebugConstants;

  constructor(env?: Environment) {
    this.env = env || new EagerTestEnvironment();
    this.registerInternalHelper('-get-dynamic-var', getDynamicVar);
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

  getInitialElement(): Simple.Element {
    return this.env.getAppendOperations().createElement('div');
  }

  registerComponent(
    type: ComponentKind,
    testType: ComponentKind,
    name: string,
    template: string,
    Class?: Opaque
  ): void {
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
      layout: null,
    };

    this.components[module] = {
      manager,
      state,
    };
  }

  getSelf(context: Opaque) {
    return new UpdatableReference(context);
  }

  registerHelper(name: string, helper: UserHelper): void {
    let glimmerHelper: GlimmerHelper = (_vm, args) => new HelperReference(helper, args);
    this.modules.register(name, 'helper', { default: glimmerHelper });
  }

  registerModifier(name: string, ModifierClass: TestModifierConstructor): void {
    let state = new TestModifierDefinitionState(ModifierClass);
    let manager = new TestModifierManager();
    this.modules.register(name, 'modifier', { default: { manager, state } });
  }

  private addRegisteredComponents(bundleCompiler: BundleCompiler<Locator>): void {
    let { components, modules, compileTimeModules } = this;
    Object.keys(components).forEach(key => {
      assert(
        key.indexOf('ui/components') !== -1,
        `Expected component key to start with ui/components, got ${key}.`
      );

      let { state, manager } = components[key];

      let locator = locatorFor({ module: key, name: 'default' });

      let block;
      let symbolTable;

      if (state.type === 'Curly' || state.type === 'Dynamic') {
        let block = bundleCompiler.preprocess(state.template!);
        let parsedLayout = { block, referrer: locator.meta, asPartial: false };
        let wrapped = new WrappedBuilder(bundleCompiler.compiler, parsedLayout);
        bundleCompiler.addCompilableTemplate(locator, wrapped);

        compileTimeModules.register(key, 'other', {
          default: wrapped.symbolTable,
        });

        symbolTable = wrapped.symbolTable;
      } else {
        block = bundleCompiler.add(
          locator,
          expect(state.template, 'expected component definition state to have template')
        );
        symbolTable = {
          hasEval: block.hasEval,
          symbols: block.symbols,
        };

        this.symbolTables.set(locator, symbolTable);

        compileTimeModules.register(key, 'other', {
          default: symbolTable,
        });
      }

      if (state.hasSymbolTable) {
        modules.register(key, 'component', {
          default: {
            state: assign({}, state, { symbolTable }),
            manager,
          },
        });
      } else {
        modules.register(key, 'component', {
          default: {
            state,
            manager,
          },
        });
      }
    });
  }

  private getBundleCompiler(): BundleCompiler<Locator> {
    let macros = new TestMacros();
    let delegate: EagerCompilerDelegate = new EagerCompilerDelegate(this.components, this.modules);
    this.constants = new DebugConstants();
    let program = new WriteOnlyProgram(this.constants);
    return new BundleCompiler(delegate, { macros, program });
  }

  private getRuntimeProgram({
    table,
    pool,
    heap,
  }: BundleCompilationResult): RuntimeProgram<Locator> {
    let resolver = new EagerRuntimeResolver(table, this.modules, this.symbolTables);
    let runtimeHeap = new Heap(heap);
    let runtimeProgram = new RuntimeProgram(new RuntimeConstants(resolver, pool), runtimeHeap);
    return runtimeProgram;
  }

  renderComponent(
    name: string,
    args: Dict<PathReference<Opaque>>,
    element: Simple.Element
  ): RenderResult {
    let bundleCompiler = this.getBundleCompiler();
    this.addRegisteredComponents(bundleCompiler);
    let compilationResult = bundleCompiler.compile();
    let { env } = this;

    let cursor = { element, nextSibling: null };
    let builder = this.getElementBuilder(env, cursor);
    let runtimeProgram = this.getRuntimeProgram(compilationResult);
    let iterator = renderComponent(
      runtimeProgram,
      env,
      builder,
      compilationResult.main,
      name,
      args
    );

    return renderSync(env, iterator);
  }

  renderTemplate(template: string, context: Dict<Opaque>, element: Simple.Element): RenderResult {
    let bundleCompiler = this.getBundleCompiler();
    let locator = locatorFor({ module: 'ui/components/main', name: 'default' });
    bundleCompiler.add(locator, template);
    this.addRegisteredComponents(bundleCompiler);

    let compilationResult = bundleCompiler.compile();

    let handle = compilationResult.table.vmHandleByModuleLocator.get(locator)!;
    let { env } = this;

    let cursor = { element, nextSibling: null };
    let builder = this.getElementBuilder(env, cursor);
    let self = this.getSelf(context);
    let dynamicScope = new TestDynamicScope();
    let runtimeProgram = this.getRuntimeProgram(compilationResult);

    let iterator = renderMain(runtimeProgram, env, self, dynamicScope, builder, handle);

    return renderSync(env, iterator);
  }
}

export class NodeRenderDelegate extends EagerRenderDelegate {
  constructor(env = new NodeEnv({ document: createHTMLDocument() })) {
    super(env);
  }
}
