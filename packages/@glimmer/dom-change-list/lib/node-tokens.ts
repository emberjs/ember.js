import { NodeTokens } from '@glimmer/interfaces';
import { SimpleNode } from '@simple-dom/interface';

export type NodeToken = number;

export class NodeTokensImpl implements NodeTokens {
  private nodes: SimpleNode[] = [];

  register(node: SimpleNode): NodeToken {
    let token = this.nodes.length;
    this.nodes.push(node);
    return token;
  }

  reify(token: NodeToken): SimpleNode {
    return this.nodes[token];
  }
}
