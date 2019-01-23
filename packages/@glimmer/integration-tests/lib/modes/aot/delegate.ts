import {
  BundleCompiler,
  DebugConstants,
  ModuleLocatorMap,
  normalizeLocator,
  BundleCompilationResult,
} from '@glimmer/bundle-compiler';
import {
  ComponentCapabilities,
  ComponentDefinition,
  ComponentManager,
  Cursor,
  Dict,
  Environment,
  Helper as GlimmerHelper,
  ModuleLocator,
  ProgramSymbolTable,
  RenderResult,
  AotRuntimeContext,
  ConstantPool,
  ElementBuilder,
} from '@glimmer/interfaces';
import { WrappedBuilder } from '@glimmer/opcode-compiler';
import { PathReference, UpdatableReference, StableState } from '@glimmer/reference';
import {
  clientBuilder,
  getDynamicVar,
  renderAotComponent,
  renderAotMain,
  renderSync,
  AotRuntime,
} from '@glimmer/runtime';
import { assert, assign, expect, Option } from '@glimmer/util';
import { SimpleElement, SimpleDocument } from '@simple-dom/interface';
import { BasicComponent, BasicComponentManager } from '../../components/basic';
import {
  EmberishCurlyComponent,
  EmberishCurlyComponentManager,
} from '../../components/emberish-curly';
import {
  EmberishGlimmerComponent,
  EmberishGlimmerComponentManager,
  EMBERISH_GLIMMER_CAPABILITIES,
} from '../../components/emberish-glimmer';
import RenderDelegate from '../../render-delegate';
import { TestComponentDefinitionState } from '../../components/test-component';
import { ComponentKind } from '../../components/types';
import { BASIC_CAPABILITIES, EMBERISH_CURLY_CAPABILITIES } from '../../components/capabilities';
import { AotCompilerRegistry, Modules } from './registry';
import { locatorFor } from '../../locator';
import { UserHelper, HelperReference } from '../../helpers';
import {
  TestModifierConstructor,
  TestModifierDefinitionState,
  TestModifierManager,
} from '../../modifiers';
import AotRuntimeResolverImpl from './resolver';
import { TestMacros } from '../../compile/macros';
import AotCompilerDelegate from './compiler-delegate';

export type RenderDelegateComponentDefinition = ComponentDefinition<TestComponentDefinitionState>;

type Entries<T> = { [F in ComponentKind]: Option<T> };

const COMPONENT_CLASSES: Entries<unknown> = {
  Basic: BasicComponent,
  Glimmer: EmberishGlimmerComponent,
  Dynamic: EmberishCurlyComponent,
  Curly: EmberishCurlyComponent,
  Fragment: null,
};

const COMPONENT_MANAGERS: Entries<ComponentManager> = {
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

export class AotRenderDelegate implements RenderDelegate {
  static readonly isEager = true;
  static style = 'aot';

  protected registry = new AotCompilerRegistry();
  protected compileTimeModules = new Modules();
  protected symbolTables = new ModuleLocatorMap<ProgramSymbolTable, ModuleLocator>();
  public constants!: DebugConstants;
  private doc: SimpleDocument;

  constructor(doc?: SimpleDocument) {
    this.registerInternalHelper('-get-dynamic-var', getDynamicVar);
    this.doc = doc || (document as SimpleDocument);
  }

  private registerInternalHelper(name: string, helper: GlimmerHelper): GlimmerHelper {
    this.registry.register(name, 'helper', { default: helper });
    return helper;
  }

  getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder {
    return clientBuilder(env, cursor);
  }

  getInitialElement(): SimpleElement {
    return this.doc.createElement('div');
  }

  createElement(tagName: string): SimpleElement {
    return this.doc.createElement(tagName);
  }

  registerComponent(
    type: ComponentKind,
    testType: ComponentKind,
    name: string,
    template: string,
    Class?: unknown
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

    this.registry.addComponent(module, manager, state);
  }

  getSelf(context: object): UpdatableReference {
    return StableState(context);
  }

  registerHelper(name: string, helper: UserHelper): void {
    let glimmerHelper: GlimmerHelper = args => new HelperReference(helper, args);
    this.registry.register(name, 'helper', { default: glimmerHelper });
  }

  registerModifier(name: string, ModifierClass: TestModifierConstructor): void {
    let state = new TestModifierDefinitionState(ModifierClass);
    let manager = new TestModifierManager();
    this.registry.register(name, 'modifier', { default: { manager, state } });
  }

  private addRegisteredComponents(bundleCompiler: BundleCompiler): void {
    let { registry, compileTimeModules } = this;
    Object.keys(registry.components).forEach(key => {
      assert(
        key.indexOf('ui/components') !== -1,
        `Expected component key to start with ui/components, got ${key}.`
      );

      let { state, manager } = registry.components[key];

      let locator = locatorFor({ module: key, name: 'default' });

      let block;
      let symbolTable;

      if (state.type === 'Curly' || state.type === 'Dynamic') {
        let block = bundleCompiler.preprocess(state.template!);
        let parsedLayout = { block, referrer: locator, asPartial: false };
        let wrapped = new WrappedBuilder(parsedLayout);
        bundleCompiler.addCompilableTemplate(normalizeLocator(locator), wrapped);

        compileTimeModules.register(key, 'other', {
          default: wrapped.symbolTable,
        });

        symbolTable = wrapped.symbolTable;

        this.symbolTables.set(locator, symbolTable);
      } else {
        block = bundleCompiler.addTemplateSource(
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
        registry.register(key, 'component', {
          default: {
            state: assign({}, state, { symbolTable }),
            manager,
          },
        });
      } else {
        registry.register(key, 'component', {
          default: {
            state,
            manager,
          },
        });
      }
    });
  }

  private getBundleCompiler(): BundleCompiler {
    let { compiler, constants } = getBundleCompiler(this.registry);
    this.constants = constants;

    return compiler;
  }

  getConstants(): ConstantPool {
    return this.constants.toPool();
  }

  private getRuntimeContext({ table, pool, heap }: BundleCompilationResult): AotRuntimeContext {
    let resolver = new AotRuntimeResolverImpl(table, this.registry.modules, this.symbolTables);

    return AotRuntime(this.doc, { constants: pool, heap }, resolver);
  }

  renderComponent(
    name: string,
    args: Dict<PathReference<unknown>>,
    element: SimpleElement
  ): RenderResult {
    let bundleCompiler = this.getBundleCompiler();
    this.addRegisteredComponents(bundleCompiler);
    let compilationResult = bundleCompiler.compile();

    let cursor = { element, nextSibling: null };
    let runtime = this.getRuntimeContext(compilationResult);
    let builder = this.getElementBuilder(runtime.env, cursor);
    let iterator = renderAotComponent(runtime, builder, compilationResult.main, name, args);

    return renderSync(runtime.env, iterator);
  }

  renderTemplate(template: string, context: Dict<unknown>, element: SimpleElement): RenderResult {
    this.registerComponent('Glimmer', 'Glimmer', 'main', template);
    let bundleCompiler = this.getBundleCompiler();
    let locator = locatorFor({ module: 'ui/components/main', name: 'default' });
    // bundleCompiler.add(locator, template);
    this.addRegisteredComponents(bundleCompiler);

    let compilationResult = bundleCompiler.compile();

    let handle = compilationResult.table.vmHandleByModuleLocator.get(locator)!;

    let cursor = { element, nextSibling: null };
    let runtime = this.getRuntimeContext(compilationResult);
    let builder = this.getElementBuilder(runtime.env, cursor);
    let self = this.getSelf(context);

    let iterator = renderAotMain(runtime, self, builder, handle);

    return renderSync(runtime.env, iterator);
  }
}

function getBundleCompiler(
  registry: AotCompilerRegistry
): { compiler: BundleCompiler; constants: DebugConstants } {
  let delegate: AotCompilerDelegate = new AotCompilerDelegate(registry);
  let constants = new DebugConstants();
  let compiler = new BundleCompiler(delegate, {
    macros: new TestMacros(),
    constants,
  });
  return { constants, compiler };
}
