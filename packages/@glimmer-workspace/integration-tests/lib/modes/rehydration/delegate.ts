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
  Template,
  TreeBuilder,
} from '@glimmer/interfaces';
import type Component from '@ember/component';
import type { ASTPluginBuilder, PrecompileOptions } from '@glimmer/syntax';
import { castToSimple } from '@glimmer/debug-util';
import { serializeBuilder } from '@glimmer/node';
import type { BaseRenderer } from '@ember/-internals/glimmer/lib/base-renderer';
import ResolverImpl from '@ember/-internals/glimmer/lib/resolver';
import createHTMLDocument from '@simple-dom/document';

import type { ComponentKind } from '../../components';
import type { UserHelper } from '../../helpers';
import type { TestModifierConstructor } from '../../modifiers';
import type RenderDelegate from '../../render-delegate';
import type { DebugBounds, RenderDelegateOptions, RenderHandle } from '../../render-delegate';
import type { DebugRehydrateTree } from './builder';

import { preprocess } from '../../compile';
import { replaceHTML, toInnerHTML } from '../../dom/simple-utils';
import {
  registerClassicComponent,
  registerComponent,
  registerHelper,
  registerHelperDefinition,
  registerModifier,
} from '../jit/register';
import { createOwner, teardownOwners, type TestOwner } from '../owner';
import { boundsOf, createRenderer, handleWithBounds } from '../renderer';
import { renderLooseTemplate } from '../loose-template';
import { debugRehydrateTree } from './builder';

export interface RehydrationStats {
  clearedNodes: SimpleNode[];
}

export class RehydrationDelegate implements RenderDelegate {
  static readonly isEager = false;
  static readonly style: string = 'rehydration';

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
      debugRenderTree,
      false
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

  debugBounds(handle: RenderHandle): DebugBounds {
    return boundsOf(handle);
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

    // Emulate server-side render
    renderLooseTemplate(
      this.serverRenderer,
      this.serverOwner,
      this.compileTemplate(template, this.serverOwner),
      context,
      cursor
    );

    this.serverRendered = true;
    takeSnapshot();
    return this.serialize(element);
  }

  serialize(element: SimpleElement): string {
    return toInnerHTML(element);
  }

  renderClientSide(template: string, context: Dict, element: SimpleElement): RenderHandle {
    // Client-side rehydration
    let cursor = { element, nextSibling: null };
    let root = renderLooseTemplate(
      this.clientRenderer,
      this.clientOwner,
      this.compileTemplate(template, this.clientOwner),
      context,
      cursor
    );

    this.rehydrationStats = {
      clearedNodes: this.lastClientTree!.clearedNodes,
    };

    return handleWithBounds(
      {
        rerender: () => this.clientRenderer.rerender(),
        destroy: () => root.destroy(),
      },
      () => root.bounds()
    );
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

  /** A real classic `Component` for curly invocation (see `registerClassicComponent`). */
  registerClassicComponent(name: string, layout: string, Class?: typeof Component): void {
    registerClassicComponent(this.clientOwner, name, layout, Class);
    if (!this.serverRendered) registerClassicComponent(this.serverOwner, name, layout, Class);
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

  protected compileTemplate(template: string, owner: object): Template {
    return preprocess(template, this.precompileOptions, owner);
  }

  protected get precompileOptions(): PrecompileOptions {
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
