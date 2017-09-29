import { RenderResult, ElementBuilder, Environment, Cursor } from '@glimmer/runtime';
import { Dict, Opaque } from '@glimmer/util';

import { ComponentKind, ComponentTypes } from './render-test';
import { UserHelper } from './environment/helper';

export default interface RenderDelegate {
  getInitialElement(): HTMLElement;
  registerComponent<K extends ComponentKind, L extends ComponentKind>(type: K, testType: L, name: string, layout: string, Class?: ComponentTypes[K]): void;
  registerHelper(name: string, helper: UserHelper): void;
  renderTemplate(template: string, context: Dict<Opaque>, element: HTMLElement, snapshot: () => void): RenderResult;
  getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder;
}
