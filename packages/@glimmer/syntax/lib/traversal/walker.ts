import { type Option } from '@glimmer/interfaces';

import type * as ASTv1 from '../v1/api';

export type NodeCallback<N extends ASTv1.Node> = (node: N, walker: Walker) => void;

export default class Walker {
  public stack: unknown[] = [];
  constructor(public order?: unknown) {}

  visit<N extends ASTv1.Node>(node: Option<N>, visitor: NodeCallback<N>): void {
    if (!node) {
      return;
    }

    this.stack.push(node);

    if (this.order === 'post') {
      this.children(node, visitor);
      visitor(node, this);
    } else {
      visitor(node, this);
      this.children(node, visitor);
    }

    this.stack.pop();
  }

  children<N extends ASTv1.Node>(
    node: N & ASTv1.Node,
    callback: NodeCallback<N & ASTv1.Node>
  ): void {
    switch (node.type) {
      case 'Block':
      case 'Template':
        return visitors.Program(this, node as unknown as ASTv1.Program, callback);
      case 'ElementNode':
        return visitors.ElementNode(this, node, callback);
      case 'BlockStatement':
        return visitors.BlockStatement(this, node, callback);
      default:
        return;
    }
  }
}

const visitors = {
  Program(walker: Walker, node: ASTv1.Program, callback: NodeCallback<ASTv1.Statement>) {
    walkBody(walker, node.body, callback);
  },

  Template(walker: Walker, node: ASTv1.Template, callback: NodeCallback<ASTv1.Node>) {
    walkBody(walker, node.body, callback);
  },

  Block(walker: Walker, node: ASTv1.Block, callback: NodeCallback<ASTv1.Node>) {
    walkBody(walker, node.body, callback);
  },

  ElementNode(walker: Walker, node: ASTv1.ElementNode, callback: NodeCallback<ASTv1.Node>) {
    walkBody(walker, node.children, callback);
  },

  BlockStatement(walker: Walker, node: ASTv1.BlockStatement, callback: NodeCallback<ASTv1.Block>) {
    walker.visit(node.program, callback);
    walker.visit(node.inverse || null, callback);
  },
} as const;

function walkBody(
  walker: Walker,
  body: ASTv1.Statement[],
  callback: NodeCallback<ASTv1.Statement>
) {
  for (const child of body) {
    walker.visit(child, callback);
  }
}
