import type {
  Cursor,
  Dict,
  ElementNamespace,
  Environment,
  Nullable,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
  SimpleText,
  TreeBuilder,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import type { ASTPluginBuilder, PrecompileOptions } from '@glimmer/syntax';
import { castToSimple } from '@glimmer/debug-util';
import { serializeBuilder } from '@glimmer/node';
import { createConstRef } from '@glimmer/reference';
import type { BaseRenderer } from '@ember/-internals/glimmer/lib/base-renderer';
import createHTMLDocument from '@simple-dom/document';

import type { ComponentKind } from '../../components';
import type { UserHelper } from '../../helpers';
import type { TestModifierConstructor } from '../../modifiers';
import type RenderDelegate from '../../render-delegate';
import type { RenderDelegateOptions, RenderHandle } from '../../render-delegate';
import type { DebugRehydrateTree } from './builder';

import { preprocess } from '../../compile';
import { replaceHTML, toInnerHTML } from '../../dom/simple-utils';
import { registerComponent, registerHelper, registerModifier } from '../jit/register';
import { TestJitRegistry } from '../jit/registry';
import { TestJitRuntimeResolver } from '../jit/resolver';
import { createOwner, teardownOwners } from '../owner';
import { createRenderer } from '../renderer';
import { TemplateRootState } from '../template-root';
import { debugRehydrateTree } from './builder';

export interface RehydrationStats {
  clearedNodes: SimpleNode[];
}

export class RehydrationDelegate implements RenderDelegate {
  static readonly isEager = false;
  static readonly style = 'rehydration';

  private plugins: ASTPluginBuilder[] = [];

  /** The renderers are Ember's `BaseRenderer`, one per side, each with its own owner and document. */
  protected clientOwner: object = createOwner();
  protected serverOwner: object = createOwner();
  protected clientRenderer: BaseRenderer;
  protected serverRenderer: BaseRenderer;

  private clientResolver: TestJitRuntimeResolver;
  private serverResolver: TestJitRuntimeResolver;

  protected clientRegistry: TestJitRegistry;
  protected serverRegistry: TestJitRegistry;

  public clientDoc: SimpleDocument;
  public serverDoc: SimpleDocument;

  declare public rehydrationStats: RehydrationStats;

  /** The tree builder of the most recent client render, for `rehydrationStats`. */
  protected lastClientTree: Nullable<DebugRehydrateTree> = null;

  private self: Nullable<Reference> = null;

  constructor(options?: RenderDelegateOptions) {
    let debugRenderTree = options?.debugRenderTree ?? false;

    this.clientDoc = castToSimple(document);
    this.clientRegistry = new TestJitRegistry();
    this.clientResolver = new TestJitRuntimeResolver(this.clientRegistry);
    this.clientRenderer = createRenderer(
      this.clientOwner,
      this.clientDoc,
      this.clientResolver,
      (env, cursor) => {
        let tree = debugRehydrateTree(env, cursor) as DebugRehydrateTree;
        this.lastClientTree = tree;
        return tree;
      },
      debugRenderTree
    );

    this.serverDoc = createHTMLDocument();
    this.serverRegistry = new TestJitRegistry();
    this.serverResolver = new TestJitRuntimeResolver(this.serverRegistry);
    this.serverRenderer = createRenderer(
      this.serverOwner,
      this.serverDoc,
      this.serverResolver,
      serializeBuilder,
      debugRenderTree
    );
  }

  /** Called after each test: see `JitRenderDelegate.teardown`. */
  teardown(): void {
    teardownOwners(this.clientOwner, this.serverOwner);
  }

  getInitialElement(): SimpleElement {
    return this.clientDoc.createElement('div');
  }

  createElement(tagName: string): SimpleElement {
    return this.clientDoc.createElement(tagName);
  }

  createTextNode(content: string): SimpleText {
    return this.clientDoc.createTextNode(content);
  }

  createElementNS(namespace: ElementNamespace, tagName: string): SimpleElement {
    return this.clientDoc.createElementNS(namespace, tagName);
  }

  createDocumentFragment(): SimpleDocumentFragment {
    return this.clientDoc.createDocumentFragment();
  }

  getElementBuilder(env: Environment, cursor: Cursor): TreeBuilder {
    if (cursor.element instanceof Node) {
      return debugRehydrateTree(env, cursor);
    }

    return serializeBuilder(env, cursor);
  }

  renderServerSide(
    template: string,
    context: Dict,
    takeSnapshot: () => void,
    element: SimpleElement | undefined = undefined
  ): string {
    element = element || this.serverDoc.createElement('div');
    let cursor = { element, nextSibling: null };
    let { state } = this.serverRenderer;

    // Emulate server-side render
    state.renderRoot(
      new TemplateRootState(
        state,
        preprocess(template, this.precompileOptions),
        this.getSelf(state.env, context),
        cursor
      )
    );

    takeSnapshot();
    return this.serialize(element);
  }

  getSelf(_env: Environment, context: unknown): Reference {
    if (!this.self) {
      this.self = createConstRef(context, 'this');
    }

    return this.self;
  }

  serialize(element: SimpleElement): string {
    return toInnerHTML(element);
  }

  renderClientSide(template: string, context: Dict, element: SimpleElement): RenderHandle {
    let { state } = this.clientRenderer;
    this.self = null;

    // Client-side rehydration
    let cursor = { element, nextSibling: null };
    let root = new TemplateRootState(
      state,
      preprocess(template, this.precompileOptions),
      this.getSelf(state.env, context),
      cursor
    );
    state.renderRoot(root);

    this.rehydrationStats = {
      clearedNodes: this.lastClientTree!.clearedNodes,
    };

    return {
      rerender: () => this.clientRenderer.rerender(),
      destroy: () => root.destroy(),
      debugBounds: () => root.result!,
    };
  }

  renderTemplate(
    template: string,
    context: Dict,
    element: SimpleElement,
    snapshot: () => void
  ): RenderHandle {
    let serialized = this.renderServerSide(template, context, snapshot);
    replaceHTML(element, serialized);
    qunitFixture().appendChild(element);

    return this.renderClientSide(template, context, element);
  }

  registerPlugin(plugin: ASTPluginBuilder): void {
    this.plugins.push(plugin);
  }

  registerComponent(type: ComponentKind, _testType: string, name: string, layout: string): void {
    registerComponent(this.clientRegistry, type, name, layout);
    registerComponent(this.serverRegistry, type, name, layout);
  }

  registerHelper(name: string, helper: UserHelper): void {
    registerHelper(this.clientRegistry, name, helper);
    registerHelper(this.serverRegistry, name, helper);
  }

  registerHelperDefinition(name: string, definition: object) {
    this.clientRegistry.register('helper', name, definition);
    this.serverRegistry.register('helper', name, definition);
  }

  registerModifier(name: string, ModifierClass: TestModifierConstructor): void {
    registerModifier(this.clientRegistry, name, ModifierClass);
    registerModifier(this.serverRegistry, name, ModifierClass);
  }

  private get precompileOptions(): PrecompileOptions {
    return {
      plugins: {
        ast: this.plugins,
      },
    };
  }
}

export function qunitFixture(): SimpleElement {
  return castToSimple(document.getElementById('qunit-fixture')!);
}
