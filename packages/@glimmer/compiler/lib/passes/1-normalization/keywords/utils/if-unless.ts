import { type ASTv2, generateSyntaxError } from '@glimmer/syntax';

import { Err, Ok, Result } from '../../../../shared/result';
import * as mir from '../../../2-encoding/mir';
import { type NormalizationState } from '../../context';
import { VISIT_EXPRS } from '../../visitors/expressions';
import { type KeywordDelegate } from '../impl';

function assertIfUnlessInlineKeyword(type: string) {
  return (
    originalNode: ASTv2.AppendContent | ASTv2.ExpressionNode
  ): Result<{
    condition: ASTv2.ExpressionNode;
    truthy: ASTv2.ExpressionNode;
    falsy: ASTv2.ExpressionNode | null;
  }> => {
    let inverted = type === 'unless';

    let node = originalNode.type === 'AppendContent' ? originalNode.value : originalNode;
    let named = node.type === 'Call' ? node.args.named : null;
    let positional = node.type === 'Call' ? node.args.positional : null;

    if (named && !named.isEmpty()) {
      return Err(
        generateSyntaxError(
          `(${type}) cannot receive named parameters, received ${named.entries
            .map((e) => e.name.chars)
            .join(', ')}`,
          originalNode.loc
        )
      );
    }

    let condition = positional?.nth(0);

    if (!positional || !condition) {
      return Err(
        generateSyntaxError(
          `When used inline, (${type}) requires at least two parameters 1. the condition that determines the state of the (${type}), and 2. the value to return if the condition is ${
            inverted ? 'false' : 'true'
          }. Did not receive any parameters`,
          originalNode.loc
        )
      );
    }

    let truthy = positional.nth(1);
    let falsy = positional.nth(2);

    if (truthy === null) {
      return Err(
        generateSyntaxError(
          `When used inline, (${type}) requires at least two parameters 1. the condition that determines the state of the (${type}), and 2. the value to return if the condition is ${
            inverted ? 'false' : 'true'
          }. Received only one parameter, the condition`,
          originalNode.loc
        )
      );
    }

    if (positional.size > 3) {
      return Err(
        generateSyntaxError(
          `When used inline, (${type}) can receive a maximum of three positional parameters 1. the condition that determines the state of the (${type}), 2. the value to return if the condition is ${
            inverted ? 'false' : 'true'
          }, and 3. the value to return if the condition is ${
            inverted ? 'true' : 'false'
          }. Received ${positional?.size ?? 0} parameters`,
          originalNode.loc
        )
      );
    }

    return Ok({ condition, truthy, falsy });
  };
}

function translateIfUnlessInlineKeyword(type: string) {
  let inverted = type === 'unless';

  return (
    {
      node,
      state,
    }: { node: ASTv2.AppendContent | ASTv2.ExpressionNode; state: NormalizationState },
    {
      condition,
      truthy,
      falsy,
    }: {
      condition: ASTv2.ExpressionNode;
      truthy: ASTv2.ExpressionNode;
      falsy: ASTv2.ExpressionNode | null;
    }
  ): Result<mir.IfInline> => {
    let conditionResult = VISIT_EXPRS.visit(condition, state);
    let truthyResult = VISIT_EXPRS.visit(truthy, state);
    let falsyResult = falsy ? VISIT_EXPRS.visit(falsy, state) : Ok(null);

    return Result.all(conditionResult, truthyResult, falsyResult).mapOk(
      ([condition, truthy, falsy]) => {
        if (inverted) {
          condition = new mir.Not({ value: condition, loc: node.loc });
        }

        return new mir.IfInline({
          loc: node.loc,
          condition,
          truthy,
          falsy,
        });
      }
    );
  };
}

export function ifUnlessInlineKeyword(type: string): KeywordDelegate<
  ASTv2.CallExpression | ASTv2.AppendContent,
  {
    condition: ASTv2.ExpressionNode;
    truthy: ASTv2.ExpressionNode;
    falsy: ASTv2.ExpressionNode | null;
  },
  mir.IfInline
> {
  return {
    assert: assertIfUnlessInlineKeyword(type),
    translate: translateIfUnlessInlineKeyword(type),
  };
}
