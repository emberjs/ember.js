import {
  Cursor,
  Dict,
  DynamicScope,
  ElementBuilder,
  ElementNamespace,
  Environment,
  Helper,
  RenderResult,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleText,
} from '@glimmer/interfaces';
import { Reference } from '@glimmer/reference';
import { EnvironmentDelegate } from '@glimmer/runtime';
import { ASTPluginBuilder } from '@glimmer/syntax';

import { ComponentKind, ComponentTypes } from './components';
import { UserHelper } from './helpers';

export interface RenderDelegateOptions {
  doc?: SimpleDocument | Document | undefined;
  env?: EnvironmentDelegate | undefined;
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
  getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder;
  getSelf(env: Environment, context: unknown): Reference;
}
