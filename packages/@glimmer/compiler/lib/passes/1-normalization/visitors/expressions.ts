import { PresentArray } from '@glimmer/interfaces';
import { ASTv2 } from '@glimmer/syntax';
import { isPresent } from '@glimmer/util';

import { AnyOptionalList, PresentList } from '../../../shared/list';
import { Ok, Result, ResultArray } from '../../../shared/result';
import * as mir from '../../2-encoding/mir';
import { NormalizationState } from '../context';
import { EXPR_KEYWORDS } from '../keywords';
import { assertIsValidHelper, hasPath } from '../utils/is-node';

export class NormalizeExpressions {
  visit(node: ASTv2.ExpressionNode, state: NormalizationState): Result<mir.ExpressionNode> {
    let translated = EXPR_KEYWORDS.translate(node, state);

    if (translated !== null) {
      return translated;
    }

    switch (node.type) {
      case 'Literal':
        return Ok(this.Literal(node));
      case 'Interpolate':
        return this.Interpolate(node, state);
      case 'Path':
        return this.PathExpression(node, state);
      case 'Call':
        return this.CallExpression(node, state);
    }
  }

  visitList(
    nodes: PresentArray<ASTv2.ExpressionNode>,
    state: NormalizationState
  ): Result<PresentList<mir.ExpressionNode>>;
  visitList(
    nodes: readonly ASTv2.ExpressionNode[],
    state: NormalizationState
  ): Result<AnyOptionalList<mir.ExpressionNode>>;
  visitList(
    nodes: readonly ASTv2.ExpressionNode[],
    state: NormalizationState
  ): Result<AnyOptionalList<mir.ExpressionNode>> {
    return new ResultArray(nodes.map((e) => VISIT_EXPRS.visit(e, state))).toOptionalList();
  }

  /**
   * Normalize paths into `hir.Path` or a `hir.Expr` that corresponds to the ref.
   *
   * TODO since keywords don't support tails anyway, distinguish PathExpression from
   * VariableReference in ASTv2.
   */
  PathExpression(
    path: ASTv2.PathExpression,
    state: NormalizationState
  ): Result<mir.ExpressionNode> {
    let expr = EXPR_KEYWORDS.translate(path, state);

    if (expr !== null) {
      return expr;
    }

    let ref = this.VariableReference(path.ref);
    let { tail } = path;

    if (isPresent(tail)) {
      let tailLoc = tail[0].loc.extend(tail[tail.length - 1].loc);
      return Ok(
        new mir.PathExpression({
          loc: path.loc,
          head: ref,
          tail: new mir.Tail({ loc: tailLoc, members: tail }),
        })
      );
    } else {
      return Ok(ref);
    }
  }

  VariableReference(ref: ASTv2.VariableReference): ASTv2.VariableReference {
    return ref;
  }

  Literal(literal: ASTv2.LiteralExpression): ASTv2.LiteralExpression {
    return literal;
  }

  Interpolate(
    expr: ASTv2.InterpolateExpression,
    state: NormalizationState
  ): Result<mir.InterpolateExpression> {
    return VISIT_EXPRS.visitList(expr.parts, state).mapOk(
      (parts) => new mir.InterpolateExpression({ loc: expr.loc, parts: parts })
    );
  }

  CallExpression(
    expr: ASTv2.CallExpression,
    state: NormalizationState
  ): Result<mir.ExpressionNode> {
    if (!hasPath(expr)) {
      throw new Error(`unimplemented subexpression at the head of a subexpression`);
    } else {
      assertIsValidHelper(expr, 'helper');

      return Result.all(
        VISIT_EXPRS.visit(expr.callee, state),
        VISIT_EXPRS.Args(expr.args, state)
      ).mapOk(
        ([callee, args]) =>
          new mir.CallExpression({
            loc: expr.loc,
            callee,
            args,
          })
      );
    }
  }

  Args({ positional, named, loc }: ASTv2.Args, state: NormalizationState): Result<mir.Args> {
    return Result.all(this.Positional(positional, state), this.NamedArguments(named, state)).mapOk(
      ([positional, named]) =>
        new mir.Args({
          loc,
          positional,
          named,
        })
    );
  }

  Positional(
    positional: ASTv2.PositionalArguments,
    state: NormalizationState
  ): Result<mir.Positional> {
    return VISIT_EXPRS.visitList(positional.exprs, state).mapOk(
      (list) =>
        new mir.Positional({
          loc: positional.loc,
          list,
        })
    );
  }

  NamedArguments(
    named: ASTv2.NamedArguments,
    state: NormalizationState
  ): Result<mir.NamedArguments> {
    let pairs = named.entries.map((arg) =>
      VISIT_EXPRS.visit(arg.value, state).mapOk(
        (value) =>
          new mir.NamedArgument({
            loc: arg.loc,
            key: arg.name,
            value,
          })
      )
    );

    return new ResultArray(pairs)
      .toOptionalList()
      .mapOk((pairs) => new mir.NamedArguments({ loc: named.loc, entries: pairs }));
  }
}

export const VISIT_EXPRS = new NormalizeExpressions();
