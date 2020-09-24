import {
  SimpleElement,
  SimpleText,
  ElementNamespace,
  SimpleDocumentFragment,
  SimpleDocument,
} from '@simple-dom/interface';
import { ASTPluginBuilder } from '@glimmer/syntax';
import { ComponentKind, ComponentTypes } from './components';
import { UserHelper } from './helpers';
import {
  Dict,
  RenderResult,
  Environment,
  Cursor,
  ElementBuilder,
  Helper,
} from '@glimmer/interfaces';
import { Reference } from '@glimmer/reference';
import { EnvironmentDelegate } from '@glimmer/runtime';

export interface RenderDelegateOptions {
  doc?: SimpleDocument | Document;
  env?: EnvironmentDelegate;
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
  registerPartial(name: string, content: string): void;
  registerModifier(name: string, klass: unknown): void;
  renderTemplate(
    template: string,
    context: Dict<unknown>,
    element: SimpleElement,
    snapshot: () => void
  ): RenderResult;
  getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder;
  getSelf(env: Environment, context: unknown): Reference;
}
