import { Option } from '@glimmer/interfaces';
import { SimpleElement, SimpleNode } from '@glimmer/interfaces';

export function clearElement(parent: SimpleElement) {
  let current: Option<SimpleNode> = parent.firstChild;

  while (current) {
    let next = current.nextSibling;
    parent.removeChild(current);
    current = next;
  }
}
