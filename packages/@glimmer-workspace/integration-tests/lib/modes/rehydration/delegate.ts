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
import ResolverImpl from '@ember/-internals/glimmer/lib/resolver';
import createHTMLDocument from '@simple-dom/document';

import type { ComponentKind } from '../../components';
import type { UserHelper } from '../../helpers';
import type { TestModifierConstructor } from '../../modifiers';
import type RenderDelegate from '../../render-delegate';
import type { RenderDelegateOptions, RenderHandle } from '../../render-delegate';
import type { DebugRehydrateTree } from './builder';

import { preprocess } from '../../compile';
import { replaceHTML, toInnerHTML } from '../../dom/simple-utils';
import {
  registerComponent,
  registerHelper,
  registerHelperDefinition,
  registerModifier,
} from '../jit/register';
import { createOwner, teardownOwners, type TestOwner } from '../owner';
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
  protected clientOwner: TestOwner = createOwner();
  protected serverOwner: TestOwner = createOwner();
  protected clientRenderer: BaseRenderer;
  protected serverRenderer: BaseRenderer;

  public clientDoc: SimpleDocument;
  public serverDoc: SimpleDocument;

  /**
   * Registration follows the phase: both owners until the server has rendered, then the client
   * owner only. Server and client are separate apps with separate registries, and Ember's registry
   * refuses to re-register a name that has been resolved. The server owner has resolved the
   * components by then, while the client owner has resolved nothing before `renderClientSide`, so a
   * registration made in the client phase (possibly a different layout under the same name)
   * replaces the earlier one on the client owner.
   */
  protected serverRendered = false;

  declare public rehydrationStats: RehydrationStats;

  /** The tree builder of the most recent client render, for `rehydrationStats`. */
  protected lastClientTree: Nullable<DebugRehydrateTree> = null;

  private self: Nullable<Reference> = null;

  constructor(options?: RenderDelegateOptions) {
    let debugRenderTree = options?.debugRenderTree ?? false;

    this.clientDoc = castToSimple(document);
    this.clientRenderer = createRenderer(
      this.clientOwner,
      this.clientDoc,
      new ResolverImpl(),
      (env, cursor) => {
        let tree = debugRehydrateTree(env, cursor) as DebugRehydrateTree;
        this.lastClientTree = tree;
        return tree;
      },
      debugRenderTree
    );

    this.serverDoc = createHTMLDocument();
    this.serverRenderer = createRenderer(
      this.serverOwner,
      this.serverDoc,
      new ResolverImpl(),
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
        preprocess(template, this.precompileOptions, this.serverOwner),
        this.getSelf(state.env, context),
        cursor
      )
    );

    this.serverRendered = true;
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
      preprocess(template, this.precompileOptions, this.clientOwner),
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
    registerComponent(this.clientOwner, type, name, layout);
    if (!this.serverRendered) registerComponent(this.serverOwner, type, name, layout);
  }

  registerHelper(name: string, helper: UserHelper): void {
    registerHelper(this.clientOwner, name, helper);
    if (!this.serverRendered) registerHelper(this.serverOwner, name, helper);
  }

  registerHelperDefinition(name: string, definition: object) {
    registerHelperDefinition(this.clientOwner, name, definition);
    if (!this.serverRendered) registerHelperDefinition(this.serverOwner, name, definition);
  }

  registerModifier(name: string, ModifierClass: TestModifierConstructor): void {
    registerModifier(this.clientOwner, name, ModifierClass);
    if (!this.serverRendered) registerModifier(this.serverOwner, name, ModifierClass);
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
