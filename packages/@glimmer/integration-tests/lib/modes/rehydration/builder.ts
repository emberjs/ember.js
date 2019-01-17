import { RehydrateBuilder } from '@glimmer/runtime';
import { SimpleNode } from '@simple-dom/interface';
import { Environment, Cursor, ElementBuilder } from '@glimmer/interfaces';

export class DebugRehydrationBuilder extends RehydrateBuilder {
  clearedNodes: SimpleNode[] = [];

  remove(node: SimpleNode) {
    let next = super.remove(node);
    let el = node as Element;

    if (node.nodeType !== 8) {
      if (el.nodeType === 1) {
        // don't stat serialized cursor positions
        if (el.tagName !== 'SCRIPT' && !el.getAttribute('gmlr')) {
          this.clearedNodes.push(node);
        }
      } else {
        this.clearedNodes.push(node);
      }
    }

    return next;
  }
}

export function debugRehydration(env: Environment, cursor: Cursor): ElementBuilder {
  return DebugRehydrationBuilder.forInitialRender(env, cursor);
}
