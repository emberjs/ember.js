import { AST } from '@glimmer/syntax';

export function isPath(node: AST.Node): node is AST.PathExpression {
  return node.type === 'PathExpression';
}

export function isSubExpression(node: AST.Node): node is AST.SubExpression {
  return node.type === 'SubExpression';
}

export function trackLocals() {
  let locals = new Map();

  let node = {
    enter(node: AST.Program | AST.ElementNode) {
      for (let param of node.blockParams) {
        let value = locals.get(param) || 0;
        locals.set(param, value + 1);
      }
    },

    exit(node: AST.Program | AST.ElementNode) {
      for (let param of node.blockParams) {
        let value = locals.get(param) - 1;

        if (value === 0) {
          locals.delete(param);
        } else {
          locals.set(param, value);
        }
      }
    },
  };

  return {
    hasLocal: (key: string) => locals.has(key),
    node,
  };
}
