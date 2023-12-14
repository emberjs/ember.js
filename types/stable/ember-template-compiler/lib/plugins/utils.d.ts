declare module 'ember-template-compiler/lib/plugins/utils' {
  import type { AST } from '@glimmer/syntax';
  export function isPath(node: AST.Node): node is AST.PathExpression;
  export function isSubExpression(node: AST.Node): node is AST.SubExpression;
  export function isStringLiteral(node: AST.Expression): node is AST.StringLiteral;
  export function trackLocals(): {
    hasLocal: (key: string) => boolean;
    node: {
      enter(node: AST.Program | AST.Block | AST.ElementNode): void;
      exit(node: AST.Program | AST.Block | AST.ElementNode): void;
    };
  };
}
