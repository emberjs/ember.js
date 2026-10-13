import type { Cursor, Environment, SimpleNode, TreeBuilder } from '@glimmer/interfaces';
import { COMMENT_NODE } from '@glimmer/constants';
import { isSimpleElement } from '@glimmer/debug-util';
import { RehydrateTree } from '@glimmer/runtime';

export class DebugRehydrateTree extends RehydrateTree {
  clearedNodes: SimpleNode[] = [];

  override remove(node: SimpleNode) {
    const next = super.remove(node);

    if (node.nodeType !== COMMENT_NODE) {
      if (isSimpleElement(node)) {
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

export function debugRehydrateTree(env: Environment, cursor: Cursor): TreeBuilder {
  return DebugRehydrateTree.forInitialRender(env, cursor);
}
