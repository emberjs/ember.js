import type {
  Cursor,
  Dict,
  ElementNamespace,
  Environment,
  RenderResult,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleText,
  TreeBuilder,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import type { ASTPluginBuilder } from '@glimmer/syntax';

import type { ComponentKind, ComponentTypes } from './components';
import type { UserHelper } from './helpers';

/**
 * What a delegate returns from `renderTemplate`/`renderComponent`: the part of
 * a render the tests drive. `rerender` is renderer-wide (it flushes every
 * root), `destroy` destroys this render.
 */
export interface RenderHandle {
  rerender(): void;
  destroy(): void;
  /** Implementation-only: the first and last node of the render, for `assertInvariants`. */
  debugBounds?(): Pick<RenderResult, 'firstNode' | 'lastNode'>;
}

export interface RenderDelegateOptions {
  doc?: SimpleDocument | Document | undefined;
  /** Create the renderer with Ember's debug render tree enabled. */
  debugRenderTree?: boolean | undefined;
}

export default interface RenderDelegate {
  getInitialElement(): SimpleElement;
  createElement(tagName: string): SimpleElement;
  createTextNode(content: string): SimpleText;
  createElementNS(namespace: ElementNamespace, tagName: string): SimpleElement;
  createDocumentFragment(): SimpleDocumentFragment;
  registerComponent<K extends ComponentKind, L extends ComponentKind>(
    type: K,
    testType: L,
    name: string,
    layout: string,
    Class?: ComponentTypes[K]
  ): void;
  registerPlugin(plugin: ASTPluginBuilder): void;
  registerHelper(name: string, helper: UserHelper): void;
  registerHelperDefinition(name: string, definition: object): void;
  registerModifier(name: string, klass: unknown): void;
  renderTemplate(
    template: string,
    context: Dict,
    element: SimpleElement,
    snapshot: () => void
  ): RenderHandle;
  renderComponent?(
    component: object,
    args: Record<string, unknown>,
    element: SimpleElement
  ): RenderHandle;
  /** Called after each test: release whatever the delegate registered globally. */
  teardown?(): void;
  getElementBuilder(env: Environment, cursor: Cursor): TreeBuilder;
  getSelf(env: Environment, context: unknown): Reference;
}
