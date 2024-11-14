import type { Cursor, TreeBuilder, Environment, SimpleNode } from '@glimmer/interfaces';
import { COMMENT_NODE, ELEMENT_NODE } from '@glimmer/constants';
import { RehydrateBuilder } from '@glimmer/runtime';

export class DebugRehydrationBuilder extends RehydrateBuilder {
  clearedNodes: SimpleNode[] = [];

  override remove(node: SimpleNode) {
    const next = super.remove(node);

    if (node.nodeType !== COMMENT_NODE) {
      if (node.nodeType === ELEMENT_NODE) {
        // don't stat serialized cursor positions
        if (node.tagName !== 'SCRIPT' || !node.getAttribute('glmr')) {
          this.clearedNodes.push(node);
        }
      } else {
        this.clearedNodes.push(node);
      }
    }

    return next;
  }
}

export function debugRehydration(env: Environment, cursor: Cursor): TreeBuilder {
  return DebugRehydrationBuilder.forInitialRender(env, cursor);
}
