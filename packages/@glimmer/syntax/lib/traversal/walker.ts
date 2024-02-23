import type { Nullable } from '@glimmer/interfaces';

import type * as ASTv1 from '../v1/api';

export type NodeCallback<N extends ASTv1.Node> = (node: N, walker: Walker) => void;

export default class Walker {
  public stack: unknown[] = [];
  constructor(public order?: unknown) {}

  visit<N extends ASTv1.Node>(node: Nullable<N>, visitor: NodeCallback<N>): void {
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
        walkBody(this, node.body, callback);
        return;
      case 'ElementNode':
        walkBody(this, node.children, callback);
        return;
      case 'BlockStatement':
        this.visit(node.program, callback);
        this.visit(node.inverse || null, callback);
        return;
      default:
        return;
    }
  }
}

function walkBody(
  walker: Walker,
  body: ASTv1.Statement[],
  callback: NodeCallback<ASTv1.Statement>
) {
  for (const child of body) {
    walker.visit(child, callback);
  }
}
