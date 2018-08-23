import { Dict, Opaque } from '@glimmer/util';
import { Factory } from 'ember-owner';
import { FrameworkObject } from 'ember-runtime';

export interface Modifier {
  element: Element;
  didInsertElement(params: Opaque[], hash: Dict<Opaque>): void;
  didUpdate(params: Opaque[], hash: Dict<Opaque>): void;
  willDestroyElement(): void;
}

export default class extends FrameworkObject {
  element = undefined;
  didInsertElement() {}
  didUpdate() {}
  willDestroyElement() {}
}

export function isModifier(maybeModifier: any): maybeModifier is Factory<Modifier> {
  return maybeModifier !== undefined;
}
