import type {
  Cursor,
  Dict,
  DynamicScope,
  ElementNamespace,
  Environment,
  Helper,
  RenderResult,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleText,
  TreeBuilder,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import type { EnvironmentDelegate } from '@glimmer/runtime';
import type { ASTPluginBuilder } from '@glimmer/syntax';

import type { ComponentKind, ComponentTypes } from './components';
import type { UserHelper } from './helpers';
import type { TestJitRegistry } from './modes/jit/registry';
import type { TestJitRuntimeResolver } from './modes/jit/resolver';

export interface RenderDelegateOptions {
  doc?: SimpleDocument | Document | undefined;
  env?: EnvironmentDelegate | undefined;
  resolver?: (registry: TestJitRegistry) => TestJitRuntimeResolver;
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
  registerInternalHelper(name: string, helper: Helper): void;
  registerModifier(name: string, klass: unknown): void;
  renderTemplate(
    template: string,
    context: Dict<unknown>,
    element: SimpleElement,
    snapshot: () => void
  ): RenderResult;
  renderComponent?(
    component: object,
    args: Record<string, unknown>,
    element: SimpleElement,
    dynamicScope?: DynamicScope
  ): RenderResult;
  getElementBuilder(env: Environment, cursor: Cursor): TreeBuilder;
  getSelf(env: Environment, context: unknown): Reference;
}
