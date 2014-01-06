import { BlockElement } from "htmlbars/ast";

function Node(ast, parent) {
  this.parent = parent;
  this.ast = ast;
  this.pos = ast.length-1;
  this.count = 0;
  this.inverse = false;
}

Node.prototype.nextChild = function() {
  var node;
  if (this.inverse) {
    this.inverse = false;
    node = this.ast[this.pos];
    this.pos--;
    this.count++;
    return new Node(node.children, this);
  }
  while (this.pos >= 0) {
    node = this.ast[this.pos];
    if (node instanceof BlockElement) {
      this.inverse = true;
      this.count++;
      return new Node(node.inverse, this);
    }
    this.pos--;
  }
  return null;
};

export function walkTree(ast, visit) {
  var node = new Node(ast, null), next;
  while (node) {
    var nextChild = node.nextChild();
    if (nextChild === null) {
      visit(node.ast, node.count);
      node = node.parent;
    } else {
      node = nextChild;
    }
  }
}
