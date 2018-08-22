import { RenderResult, ElementBuilder, Environment, Cursor } from '@glimmer/runtime';
import { Dict, Opaque } from '@glimmer/util';

import { ComponentKind, ComponentTypes } from './render-test';
import { UserHelper } from './environment/helper';
import { BasicReference } from '@glimmer/reference';
import { DebugConstants } from '@glimmer/bundle-compiler';

export default interface RenderDelegate {
  constants?: DebugConstants;
  getInitialElement(): HTMLElement;
  registerComponent<K extends ComponentKind, L extends ComponentKind>(
    type: K,
    testType: L,
    name: string,
    layout: string,
    Class?: ComponentTypes[K]
  ): void;
  registerHelper(name: string, helper: UserHelper): void;
  registerModifier(name: string, klass: Opaque): void;
  renderTemplate(
    template: string,
    context: Dict<Opaque>,
    element: HTMLElement,
    snapshot: () => void
  ): RenderResult;
  getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder;
  getSelf(context: Opaque): BasicReference<Opaque>;
}
