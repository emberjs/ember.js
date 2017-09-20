import { Option } from "@glimmer/interfaces";
import * as AST from '../types/nodes';

export type NodeCallback<N extends AST.Node> = (node: N, walker: Walker) => void;

export default class Walker {
  public stack: any[] = [];
  constructor(public order?: any) {}

  visit<N extends AST.Node>(node: Option<N>, callback: NodeCallback<N>) {
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

  children(node: any, callback: any) {
    let visitor = visitors[node.type];
    if (visitor) {
      visitor(this, node, callback);
    }
  }
}

let visitors = {
  Program(walker: Walker, node: AST.Program, callback: NodeCallback<AST.Node>) {
    for (let i = 0; i < node.body.length; i++) {
      walker.visit(node.body[i], callback);
    }
  },

  ElementNode(walker: Walker, node: AST.ElementNode, callback: NodeCallback<AST.Node>) {
    for (let i = 0; i < node.children.length; i++) {
      walker.visit(node.children[i], callback);
    }
  },

  BlockStatement(walker: Walker, node: AST.BlockStatement, callback: NodeCallback<AST.Program>) {
    walker.visit(node.program, callback);
    walker.visit(node.inverse || null, callback);
  }
};
