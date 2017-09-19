import { Simple, NodeTokens as INodeTokens } from '@glimmer/interfaces';

export type NodeToken = number;

export class NodeTokens implements INodeTokens {
  private nodes: Simple.Node[] = [];

  register(node: Simple.Node): NodeToken {
    let token = this.nodes.length;
    this.nodes.push(node);
    return token;
  }

  reify<N extends Simple.Node>(token: NodeToken): N {
    return this.nodes[token] as N;
  }
}
