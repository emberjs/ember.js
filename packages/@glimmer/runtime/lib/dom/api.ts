import type {
  AttrNamespace,
  ElementNamespace,
  GlimmerTreeConstruction,
  Nullable,
  SimpleElement,
} from '@glimmer/interfaces';

import { DOMOperations } from './operations';

export class TreeConstruction extends DOMOperations implements GlimmerTreeConstruction {
  createElementNS(namespace: ElementNamespace, tag: string): SimpleElement {
    return this.document.createElementNS(namespace, tag);
  }

  setAttribute(
    element: SimpleElement,
    name: string,
    value: string,
    namespace: Nullable<AttrNamespace> = null
  ) {
    if (namespace) {
      element.setAttributeNS(namespace, name, value);
    } else {
      element.setAttribute(name, value);
    }
  }
}

export const DOMTreeConstruction = TreeConstruction;
export type DOMTreeConstruction = TreeConstruction;
