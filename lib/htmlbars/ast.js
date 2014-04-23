import AST from "handlebars/compiler/ast";

export var MustacheNode = AST.MustacheNode;
export var SexprNode = AST.SexprNode;
export var HashNode = AST.HashNode;
export var IdNode = AST.IdNode;
export var StringNode = AST.StringNode;

export function ProgramNode(statements, strip) {
  this.type = 'program';
  this.statements = statements;
  this.strip = strip;
}

export function BlockNode(mustache, program, inverse, strip) {
  this.type = 'block';
  this.mustache = mustache;
  this.program = program;
  this.inverse = inverse;
  this.strip = strip;
}

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

export function TextNode(chars) {
  this.type = 'text';
  this.chars = chars;
}

export function childrenFor(node) {
  if (node.type === 'program') return node.statements;
  if (node.type === 'element') return node.children;
}

export function isCurly(node) {
  return node.type === 'mustache' || node.type === 'block';
}

export function appendChild(parent, node) {
  var children = childrenFor(parent);

  var len = children.length, last;
  if (len > 0) {
    last = children[len-1];
    if (isCurly(last) && isCurly(node)) {
      children.push(new TextNode(''));
    }
  }
  children.push(node);
}
