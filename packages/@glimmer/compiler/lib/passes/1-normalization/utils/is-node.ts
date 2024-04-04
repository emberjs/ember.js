import type { ASTv2 } from '@glimmer/syntax';

/**
 * This function is checking whether an AST node is a triple-curly, which means that it's
 * a "trusting" node. In the Handlebars AST, this is indicated by the `escaped` flag, which
 * is a bit of a double-negative, so we change the terminology here for clarity.
 */
export function isTrustingNode(
  value: ASTv2.AppendContent | ASTv2.HtmlText | ASTv2.InterpolateExpression
): boolean {
  if (value.type === 'AppendContent') {
    return value.trusting;
  } else {
    return false;
  }
}
