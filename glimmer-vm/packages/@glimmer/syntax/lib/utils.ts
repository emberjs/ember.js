import type * as ASTv1 from './v1/api';
import type * as HBS from './v1/handlebars-ast';

export function childrenFor(
  node: ASTv1.Block | ASTv1.Template | ASTv1.ElementNode
): ASTv1.TopLevelStatement[] {
  switch (node.type) {
    case 'Block':
    case 'Template':
      return node.body;
    case 'ElementNode':
      return node.children;
  }
}

export function appendChild(
  parent: ASTv1.Block | ASTv1.Template | ASTv1.ElementNode,
  node: ASTv1.Statement
): void {
  childrenFor(parent).push(node);
}

export function isHBSLiteral(path: HBS.Expression): path is HBS.Literal;
export function isHBSLiteral(path: ASTv1.Expression): path is ASTv1.Literal;
export function isHBSLiteral(
  path: HBS.Expression | ASTv1.Expression
): path is HBS.Literal | ASTv1.Literal {
  return (
    path.type === 'StringLiteral' ||
    path.type === 'BooleanLiteral' ||
    path.type === 'NumberLiteral' ||
    path.type === 'NullLiteral' ||
    path.type === 'UndefinedLiteral'
  );
}

export function printLiteral(literal: ASTv1.Literal): string {
  if (literal.type === 'UndefinedLiteral') {
    return 'undefined';
  } else {
    return JSON.stringify(literal.value);
  }
}

export function isUpperCase(tag: string): boolean {
  return tag[0] === tag[0]?.toUpperCase() && tag[0] !== tag[0]?.toLowerCase();
}

export function isLowerCase(tag: string): boolean {
  return tag[0] === tag[0]?.toLowerCase() && tag[0] !== tag[0]?.toUpperCase();
}
