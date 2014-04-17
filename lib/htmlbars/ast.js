import AST from "handlebars/compiler/ast";

export var ProgramNode = AST.ProgramNode;
export var BlockNode = AST.BlockNode;
export var MustacheNode = AST.MustacheNode;
export var SexprNode = AST.SexprNode;
export var HashNode = AST.HashNode;
export var IdNode = AST.IdNode;
export var StringNode = AST.StringNode;

export function ElementNode(tag, attributes, helpers, children) {
  this.type = 'element';
  this.tag = tag;
  this.attributes = attributes;
  this.helpers = helpers;
  this.children = children;

  for (var i=0, l=attributes.length; i<l; i++) {
    var attribute = attributes[i];
    attributes[attribute[0]] = attribute[1];
  }
}

export function childrenFor(node) {
  if (node instanceof ProgramNode) return node.statements;
  if (node instanceof ElementNode) return node.children;
}

export function appendChild(parent, node) {
  var children = childrenFor(parent);

  var len = children.length, last;
  if (len > 0) {
    last = children[len-1];
    if ((last instanceof MustacheNode || last instanceof BlockNode) &&
        (node instanceof MustacheNode || node instanceof BlockNode)) {
      children.push('');
    }
  }
  children.push(node);
}
