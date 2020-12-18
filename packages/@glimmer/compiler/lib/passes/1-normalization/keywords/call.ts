import { CurriedType } from '@glimmer/interfaces';
import { ASTv2, SourceSlice } from '@glimmer/syntax';

import { Ok, Result } from '../../../shared/result';
import * as mir from '../../2-encoding/mir';
import { NormalizationState } from '../context';
import { VISIT_EXPRS } from '../visitors/expressions';
import { keywords } from './impl';
import { assertValidCurryUsage } from './utils/curry';
import { assertValidGetDynamicVar } from './utils/dynamic-vars';
import { assertValidHasBlockUsage } from './utils/has-block';
import { assertValidIfUnlessInlineUsage } from './utils/if-unless';
import { assertValidLog } from './utils/log';

export const CALL_KEYWORDS = keywords('Call')
  .kw('has-block', {
    assert(node: ASTv2.CallExpression): Result<SourceSlice> {
      return assertValidHasBlockUsage('has-block', node);
    },
    translate(
      { node, state: { scope } }: { node: ASTv2.CallExpression; state: NormalizationState },
      target: SourceSlice
    ): Result<mir.HasBlock> {
      return Ok(
        new mir.HasBlock({ loc: node.loc, target, symbol: scope.allocateBlock(target.chars) })
      );
    },
  })
  .kw('has-block-params', {
    assert(node: ASTv2.CallExpression): Result<SourceSlice> {
      return assertValidHasBlockUsage('has-block-params', node);
    },
    translate(
      { node, state: { scope } }: { node: ASTv2.CallExpression; state: NormalizationState },
      target: SourceSlice
    ): Result<mir.HasBlockParams> {
      return Ok(
        new mir.HasBlockParams({ loc: node.loc, target, symbol: scope.allocateBlock(target.chars) })
      );
    },
  })
  .kw('-get-dynamic-var', {
    assert: assertValidGetDynamicVar,

    translate(
      { node, state }: { node: ASTv2.CallExpression; state: NormalizationState },
      name: ASTv2.ExpressionNode
    ): Result<mir.GetDynamicVar> {
      return VISIT_EXPRS.visit(name, state).mapOk(
        (name) => new mir.GetDynamicVar({ name, loc: node.loc })
      );
    },
  })
  .kw('log', {
    assert: assertValidLog,

    translate(
      { node, state }: { node: ASTv2.CallExpression; state: NormalizationState },
      positional: ASTv2.PositionalArguments
    ): Result<mir.Log> {
      return VISIT_EXPRS.Positional(positional, state).mapOk(
        (positional) => new mir.Log({ positional, loc: node.loc })
      );
    },
  })
  .kw('if', {
    assert: assertValidIfUnlessInlineUsage('(if)', false),

    translate(
      { node, state }: { node: ASTv2.CallExpression; state: NormalizationState },
      {
        condition,
        truthy,
        falsy,
      }: {
        condition: ASTv2.ExpressionNode;
        truthy: ASTv2.ExpressionNode;
        falsy: ASTv2.ExpressionNode | null;
      }
    ): Result<mir.IfInline> {
      let conditionResult = VISIT_EXPRS.visit(condition, state);
      let truthyResult = VISIT_EXPRS.visit(truthy, state);
      let falsyResult = falsy ? VISIT_EXPRS.visit(falsy, state) : Ok(null);

      return Result.all(conditionResult, truthyResult, falsyResult).mapOk(
        ([condition, truthy, falsy]) =>
          new mir.IfInline({
            loc: node.loc,
            condition,
            truthy,
            falsy,
          })
      );
    },
  })
  .kw('unless', {
    assert: assertValidIfUnlessInlineUsage('(unless)', true),

    translate(
      { node, state }: { node: ASTv2.CallExpression; state: NormalizationState },
      {
        condition,
        falsy,
        truthy,
      }: {
        condition: ASTv2.ExpressionNode;
        truthy: ASTv2.ExpressionNode;
        falsy: ASTv2.ExpressionNode | null;
      }
    ): Result<mir.IfInline> {
      let conditionResult = VISIT_EXPRS.visit(condition, state);
      let truthyResult = VISIT_EXPRS.visit(truthy, state);
      let falsyResult = falsy ? VISIT_EXPRS.visit(falsy, state) : Ok(null);

      return Result.all(conditionResult, truthyResult, falsyResult).mapOk(
        ([condition, truthy, falsy]) =>
          new mir.IfInline({
            loc: node.loc,

            // We reverse the condition by inserting a Not
            condition: new mir.Not({ value: condition, loc: node.loc }),
            truthy,
            falsy,
          })
      );
    },
  })
  .kw('component', {
    assert: assertValidCurryUsage('(component)', 'component', true),

    translate: translateCallCurryUsage(CurriedType.Component),
  })
  .kw('helper', {
    assert: assertValidCurryUsage('(helper)', 'helper', false),

    translate: translateCallCurryUsage(CurriedType.Helper),
  })
  .kw('modifier', {
    assert: assertValidCurryUsage('(modifier)', 'modifier', false),

    translate: translateCallCurryUsage(CurriedType.Modifier),
  });

function translateCallCurryUsage(curriedType: CurriedType) {
  return (
    { node, state }: { node: ASTv2.CallExpression; state: NormalizationState },
    { definition, args }: { definition: ASTv2.ExpressionNode; args: ASTv2.Args }
  ): Result<mir.Curry> => {
    let definitionResult = VISIT_EXPRS.visit(definition, state);
    let argsResult = VISIT_EXPRS.Args(args, state);

    return Result.all(definitionResult, argsResult).mapOk(
      ([definition, args]) =>
        new mir.Curry({
          loc: node.loc,
          curriedType,
          definition,
          args,
        })
    );
  };
}
