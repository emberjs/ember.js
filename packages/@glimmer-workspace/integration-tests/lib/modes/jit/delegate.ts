import { dasherize } from '@ember/-internals/string';
import type {
  CapturedRenderNode,
  Cursor,
  Dict,
  ElementNamespace,
  Environment,
  EvaluationContext,
  Nullable,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleText,
  Template,
  TreeBuilder,
} from '@glimmer/interfaces';
import type { CurriedValue } from '@glimmer/runtime';
import type { ASTPluginBuilder, PrecompileOptions } from '@glimmer/syntax';
import { castToBrowser, castToSimple, expect } from '@glimmer/debug-util';
import { CURRIED_COMPONENT } from '@glimmer/constants';
import { clientBuilder, curry } from '@glimmer/runtime';
import { BaseRenderer } from '@ember/-internals/glimmer/lib/base-renderer';
import ResolverImpl from '@ember/-internals/glimmer/lib/resolver';
import { captureRenderTree } from '@ember/debug';
import { renderComponent } from '@ember/renderer';

import type { ComponentKind, ComponentTypes } from '../../components';
import type { UserHelper } from '../../helpers';
import type { TestModifierConstructor } from '../../modifiers';
import type RenderDelegate from '../../render-delegate';
import type { DebugBounds, RenderDelegateOptions, RenderHandle } from '../../render-delegate';

import { preprocess } from '../../compile';
import {
  registerComponent,
  registerHelper,
  registerHelperDefinition,
  registerModifier,
} from './register';
import { createOwner, teardownOwners, type TestOwner } from '../owner';
import { boundsOf, createRenderer, handleWithBounds } from '../renderer';
import { renderLooseTemplate } from '../loose-template';

export class JitRenderDelegate implements RenderDelegate {
  static readonly isEager = false;
  static style = 'jit';

  protected resolver = new ResolverImpl();

  private plugins: ASTPluginBuilder[] = [];
  private _renderer: Nullable<BaseRenderer> = null;
  /** A real owner, destroyed in `teardown()`. */
  protected owner: TestOwner = createOwner();
  private doc: SimpleDocument;
  private debugRenderTree: boolean;

  constructor({ doc, debugRenderTree = false }: RenderDelegateOptions = {}) {
    this.doc = castToSimple(doc ?? document);
    this.debugRenderTree = debugRenderTree;
  }

  /** Whether the renderer is interactive (modifiers run). Server delegates turn it off. */
  protected get isInteractive(): boolean {
    return true;
  }

  /** One Ember renderer per delegate, created on first use. */
  protected get renderer(): BaseRenderer {
    if (this._renderer === null) {
      this._renderer = createRenderer(
        this.owner,
        this.doc,
        this.resolver,
        (env, cursor) => this.getElementBuilder(env, cursor),
        this.debugRenderTree,
        this.isInteractive
      );
    }

    return this._renderer;
  }

  get context(): EvaluationContext {
    return this.renderer.state.context;
  }

  /**
   * Called after each test. Destroys the owner and with it the renderer and its roots.
   * Renderers stay in Ember's global list while they have roots, and every later run
   * loop would revalidate them.
   */
  teardown(): void {
    teardownOwners(this.owner);
  }

  getCapturedRenderTree(): CapturedRenderNode[] {
    return captureRenderTree(this.owner);
  }

  debugBounds(handle: RenderHandle): DebugBounds {
    return boundsOf(handle);
  }

  isArgumentCaptureError(value: unknown): boolean {
    return this.context.env.isArgumentCaptureError?.(value) ?? false;
  }

  getInitialElement(): SimpleElement {
    if (isBrowserTestDocument(this.doc)) {
      return castToSimple(castToBrowser(this.doc).getElementById('qunit-fixture')!);
    } else {
      return this.createElement('div');
    }
  }

  createElement(tagName: string): SimpleElement {
    return this.doc.createElement(tagName);
  }

  createTextNode(content: string): SimpleText {
    return this.doc.createTextNode(content);
  }

  createElementNS(namespace: ElementNamespace, tagName: string): SimpleElement {
    return this.doc.createElementNS(namespace, tagName);
  }

  createDocumentFragment(): SimpleDocumentFragment {
    return this.doc.createDocumentFragment();
  }

  createCurriedComponent(name: string): CurriedValue | null {
    let definition = this.resolver.lookupComponent(dasherize(name), this.owner);

    if (definition === null) return null;

    return curry(
      CURRIED_COMPONENT,
      this.context.program.constants.resolvedComponent(definition, name),
      {},
      null,
      true
    );
  }

  registerPlugin(plugin: ASTPluginBuilder): void {
    this.plugins.push(plugin);
  }

  registerComponent<K extends ComponentKind, L extends ComponentKind>(
    type: K,
    _testType: L,
    name: string,
    layout: Nullable<string>,
    Class?: ComponentTypes[K]
  ) {
    registerComponent(this.owner, type, name, layout, Class);
  }

  registerModifier(name: string, ModifierClass: TestModifierConstructor): void {
    registerModifier(this.owner, name, ModifierClass);
  }

  registerHelper(name: string, helper: UserHelper): void {
    registerHelper(this.owner, name, helper);
  }

  registerHelperDefinition(name: string, definition: object) {
    registerHelperDefinition(this.owner, name, definition);
  }

  getElementBuilder(env: Environment, cursor: Cursor): TreeBuilder {
    return clientBuilder(env, cursor);
  }

  renderTemplate(template: string, context: Dict, element: SimpleElement): RenderHandle {
    let cursor = { element, nextSibling: null };
    let root = renderLooseTemplate(
      this.renderer,
      this.owner,
      this.compileTemplate(template, this.owner),
      context,
      cursor
    );

    return this.handleFor(root);
  }

  renderComponent(
    component: object,
    args: Record<string, unknown>,
    element: SimpleElement
  ): RenderHandle {
    // Make sure the public `renderComponent` finds this delegate's renderer.
    void this.renderer;

    let result = renderComponent(component, {
      into: { element, nextSibling: null } as unknown as Element,
      owner: this.owner,
      args,
    });

    return {
      rerender: () => this.renderer.rerender(),
      destroy: () => result.destroy(),
    };
  }

  private handleFor(root: ReturnType<typeof renderLooseTemplate>): RenderHandle {
    return handleWithBounds(
      {
        rerender: () => this.renderer.rerender(),
        destroy: () => root.destroy(),
      },
      () => root.bounds()
    );
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

function isBrowserTestDocument(doc: SimpleDocument | Document): doc is Document {
  return 'getElementById' in doc && doc.getElementById('qunit-fixture') !== null;
}
