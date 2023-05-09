import {
  type Cursor,
  type ElementBuilder,
  type Environment,
  type SimpleNode,
} from '@glimmer/interfaces';
import { RehydrateBuilder } from '@glimmer/runtime';
import { COMMENT_NODE, ELEMENT_NODE } from '@glimmer/util';

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

export function debugRehydration(env: Environment, cursor: Cursor): ElementBuilder {
  return DebugRehydrationBuilder.forInitialRender(env, cursor);
}
