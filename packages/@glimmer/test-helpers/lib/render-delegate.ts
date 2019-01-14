import { DebugConstants } from '@glimmer/bundle-compiler';
import { Cursor, Dict, Environment, RenderResult } from '@glimmer/interfaces';
import { BasicReference } from '@glimmer/reference';
import { ElementBuilder } from '@glimmer/runtime';
import { SimpleElement } from '@simple-dom/interface';
import { UserHelper } from './environment/helper';
import { ComponentKind, ComponentTypes } from './interfaces';

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
  getSelf(context: unknown): BasicReference<unknown>;
}
