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
}

export function AttrNode(name, value) {
  this.type = 'attr';
  this.name = name;
  this.value = value;
}

export function childrenFor(node) {
  if (node instanceof ProgramNode) return node.statements;
  if (node instanceof ElementNode) return node.children;
}

export function isCurly(node) {
  return node instanceof MustacheNode || node instanceof BlockNode;
}

export function appendChild(parent, node) {
  var children = childrenFor(parent);

  var len = children.length, last;
  if (len > 0) {
    last = children[len-1];
    if (isCurly(last) && isCurly(node)) {
      children.push('');
    }
  }
  children.push(node);
}
