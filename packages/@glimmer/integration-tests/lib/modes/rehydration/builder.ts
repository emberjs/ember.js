import { Cursor, ElementBuilder, Environment } from '@glimmer/interfaces';
import { RehydrateBuilder } from '@glimmer/runtime';
import { NodeType, SimpleNode } from '@simple-dom/interface';

export class DebugRehydrationBuilder extends RehydrateBuilder {
  clearedNodes: SimpleNode[] = [];

  remove(node: SimpleNode) {
    let next = super.remove(node);

    if (node.nodeType !== NodeType.COMMENT_NODE) {
      if (node.nodeType === NodeType.ELEMENT_NODE) {
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
