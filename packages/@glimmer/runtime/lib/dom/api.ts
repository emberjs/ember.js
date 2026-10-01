import type {
  AttrNamespace,
  ElementNamespace,
  GlimmerTreeConstruction,
  Nullable,
  Shell,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
} from '@glimmer/interfaces';

import { DOMOperations } from './operations';
import { canCloneShells, cloneShell } from './shells';

function makeTreeConstruction(document: SimpleDocument): GlimmerTreeConstruction {
  return new TreeConstruction(document);
}

export class TreeConstruction extends DOMOperations implements GlimmerTreeConstruction {
  private cloning: boolean | undefined;

  canCloneShells(): boolean {
    return (this.cloning ??= canCloneShells(this.document));
  }

  cloneShell(shell: Shell, parent: SimpleElement): SimpleDocumentFragment {
    return cloneShell(this.document, makeTreeConstruction, shell, parent);
  }

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
