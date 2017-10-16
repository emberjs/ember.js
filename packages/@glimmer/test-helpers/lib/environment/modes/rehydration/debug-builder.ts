import { RehydrateBuilder, ElementBuilder, Environment, Cursor } from '@glimmer/runtime';
import { Simple } from '@glimmer/interfaces';

export class DebugRehydrationBuilder extends RehydrateBuilder {
  clearedNodes: Simple.Node[] = [];

  remove(node: Simple.Node) {
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
