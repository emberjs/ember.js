import { AST } from '@glimmer/syntax';

export function isPath(node: AST.Node): node is AST.PathExpression {
  return node.type === 'PathExpression';
}

export function isSubExpression(node: AST.Node): node is AST.SubExpression {
  return node.type === 'SubExpression';
}
