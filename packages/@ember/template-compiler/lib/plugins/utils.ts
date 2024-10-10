import type { AST } from '@glimmer/syntax';

export function isPath(node: AST.Node): node is AST.PathExpression {
  return node.type === 'PathExpression';
}

export function isSubExpression(node: AST.Node): node is AST.SubExpression {
  return node.type === 'SubExpression';
}

export function isStringLiteral(node: AST.Expression): node is AST.StringLiteral {
  return node.type === 'StringLiteral';
}

function getLocalName(node: string | AST.VarHead): string {
  if (typeof node === 'string') {
    return node;
  } else {
    return node.original;
  }
}

export function trackLocals() {
  let locals = new Map();

  let node = {
    enter(node: AST.Template | AST.Block | AST.ElementNode) {
      let params = 'params' in node ? node.params : node.blockParams;
      for (let param of params) {
        let name = getLocalName(param);
        let value = locals.get(param) || 0;
        locals.set(name, value + 1);
      }
    },

    exit(node: AST.Template | AST.Block | AST.ElementNode) {
      let params = 'params' in node ? node.params : node.blockParams;
      for (let param of params) {
        let name = getLocalName(param);
        let value = locals.get(name) - 1;

        if (value === 0) {
          locals.delete(name);
        } else {
          locals.set(name, value);
        }
      }
    },
  };

  return {
    hasLocal: (key: string) => locals.has(key),
    node,
  };
}
