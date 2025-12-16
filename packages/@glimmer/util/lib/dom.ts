import type { Nullable, SimpleElement, SimpleNode } from '@glimmer/interfaces';

export function clearElement(parent: SimpleElement) {
  let current: Nullable<SimpleNode> = parent.firstChild;

  while (current) {
    let next = current.nextSibling;
    parent.removeChild(current);
    current = next;
  }
}
