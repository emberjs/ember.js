import { Option } from '@glimmer/interfaces';

import * as ASTv1 from '../v1/api';

export type NodeCallback<N extends ASTv1.Node> = (node: N, walker: Walker) => void;

export default class Walker {
  public stack: unknown[] = [];
  constructor(public order?: unknown) {}

  visit<N extends ASTv1.Node>(node: Option<N>, callback: NodeCallback<N>): void {
    if (!node) {
      return;
    }

    this.stack.push(node);

    if (this.order === 'post') {
      this.children(node, callback);
      callback(node, this);
    } else {
      callback(node, this);
      this.children(node, callback);
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
        return visitors.Program(this, (node as unknown) as ASTv1.Program, callback);
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
  Program(walker: Walker, node: ASTv1.Program, callback: NodeCallback<ASTv1.Node>) {
    for (let i = 0; i < node.body.length; i++) {
      walker.visit(node.body[i], callback);
    }
  },

  Template(walker: Walker, node: ASTv1.Template, callback: NodeCallback<ASTv1.Node>) {
    for (let i = 0; i < node.body.length; i++) {
      walker.visit(node.body[i], callback);
    }
  },

  Block(walker: Walker, node: ASTv1.Block, callback: NodeCallback<ASTv1.Node>) {
    for (let i = 0; i < node.body.length; i++) {
      walker.visit(node.body[i], callback);
    }
  },

  ElementNode(walker: Walker, node: ASTv1.ElementNode, callback: NodeCallback<ASTv1.Node>) {
    for (let i = 0; i < node.children.length; i++) {
      walker.visit(node.children[i], callback);
    }
  },

  BlockStatement(walker: Walker, node: ASTv1.BlockStatement, callback: NodeCallback<ASTv1.Block>) {
    walker.visit(node.program, callback);
    walker.visit(node.inverse || null, callback);
  },
} as const;
