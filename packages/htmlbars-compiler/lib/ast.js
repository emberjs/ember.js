import { buildText } from "./builders";

export function childrenFor(node) {
  if (node.type === 'Program') {
    return node.body;
  }
  if (node.type === 'ElementNode') {
    return node.children;
  }
}

export function usesMorph(node) {
  return node.type === 'MustacheStatement' ||
         node.type === 'BlockStatement' ||
         node.type === 'ComponentNode';
}

export function appendChild(parent, node) {
  var children = childrenFor(parent);

  var len = children.length, last;
  if (len > 0) {
    last = children[len-1];
    if (usesMorph(last) && usesMorph(node)) {
      children.push(buildText(''));
    }
  }
  children.push(node);
}

export function isHelper(sexpr) {
  return (sexpr.params && sexpr.params.length > 0) ||
    (sexpr.hash && sexpr.hash.pairs.length > 0);
}