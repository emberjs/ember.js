import type { PresentArray } from '@glimmer/interfaces';
import { ASTv2, generateSyntaxError, type SourceSlice } from '@glimmer/syntax';
import { unreachable } from '@glimmer/util';

export type HasPath<Node extends ASTv2.CallNode = ASTv2.CallNode> = Node & {
  head: ASTv2.PathExpression;
};

export type HasArguments =
  | {
      params: PresentArray<ASTv2.ExpressionNode>;
    }
  | {
      hash: {
        pairs: PresentArray<ASTv2.NamedArgument>;
      };
    };

export type HelperInvocation<Node extends ASTv2.CallNode = ASTv2.CallNode> = HasPath<Node> &
  HasArguments;

export function hasPath<N extends ASTv2.CallNode>(node: N): node is HasPath<N> {
  return node.callee.type === 'Path';
}

export function isHelperInvocation<N extends ASTv2.CallNode>(
  node: ASTv2.CallNode
): node is HelperInvocation<N> {
  if (!hasPath(node)) {
    return false;
  }

  return !node.args.isEmpty();
}

export interface SimplePath extends ASTv2.PathExpression {
  tail: [SourceSlice];
  data: false;
  this: false;
}

export type SimpleHelper<N extends HasPath> = N & {
  path: SimplePath;
};

export function isSimplePath(path: ASTv2.ExpressionNode): path is SimplePath {
  if (path.type === 'Path') {
    let { ref: head, tail: parts } = path;

    return head.type === 'Free' && !ASTv2.isStrictResolution(head.resolution) && parts.length === 0;
  } else {
    return false;
  }
}

export function isStrictHelper(expr: HasPath): boolean {
  if (expr.callee.type !== 'Path') {
    return true;
  }

  if (expr.callee.ref.type !== 'Free') {
    return true;
  }

  return ASTv2.isStrictResolution(expr.callee.ref.resolution);
}

export function assertIsValidModifier<N extends HasPath>(
  helper: N
): asserts helper is SimpleHelper<N> {
  if (isStrictHelper(helper) || isSimplePath(helper.callee)) {
    return;
  }

  throw generateSyntaxError(
    `\`${printPath(helper.callee)}\` is not a valid name for a modifier`,
    helper.loc
  );
}

function printPath(path: ASTv2.ExpressionNode): string {
  switch (path.type) {
    case 'Literal':
      return JSON.stringify(path.value);
    case 'Path': {
      let printedPath = [printPathHead(path.ref)];
      printedPath.push(...path.tail.map((t) => t.chars));
      return printedPath.join('.');
    }
    case 'Call':
      return `(${printPath(path.callee)} ...)`;
    case 'DeprecatedCall':
      return `${path.callee.name}`;
    case 'Interpolate':
      throw unreachable('a concat statement cannot appear as the head of an expression');
  }
}

function printPathHead(head: ASTv2.VariableReference): string {
  switch (head.type) {
    case 'Arg':
      return head.name.chars;
    case 'Free':
    case 'Local':
      return head.name;
    case 'This':
      return 'this';
  }
}

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
