import { Option } from '@glimmer/interfaces';
import { SimpleElement, SimpleNode } from '@simple-dom/interface';

export function clearElement(parent: SimpleElement) {
  let current: Option<SimpleNode> = parent.firstChild;

  while (current) {
    let next = current.nextSibling;
    parent.removeChild(current);
    current = next;
  }
}
