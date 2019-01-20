import { DebugConstants } from '@glimmer/bundle-compiler';
import { SimpleElement } from '@simple-dom/interface';
import { ComponentKind, ComponentTypes } from './components';
import { UserHelper } from './helpers';
import { Dict, RenderResult, Environment, Cursor, ElementBuilder } from '@glimmer/interfaces';
import { UpdatableReference, ConstReference } from '@glimmer/reference';

export default interface RenderDelegate {
  constants?: DebugConstants;
  getInitialElement(): SimpleElement;
  createElement(tagName: string): SimpleElement;
  registerComponent<K extends ComponentKind, L extends ComponentKind>(
    type: K,
    testType: L,
    name: string,
    layout: string,
    Class?: ComponentTypes[K]
  ): void;
  registerHelper(name: string, helper: UserHelper): void;
  registerModifier(name: string, klass: unknown): void;
  renderTemplate(
    template: string,
    context: Dict<unknown>,
    element: SimpleElement,
    snapshot: () => void
  ): RenderResult;
  getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder;
  getSelf(context: unknown): UpdatableReference | ConstReference;
}
