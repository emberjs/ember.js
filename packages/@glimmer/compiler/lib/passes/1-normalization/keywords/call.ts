import { CurriedType } from '@glimmer/interfaces';
import { ASTv2, SourceSlice } from '@glimmer/syntax';

import { Ok, Result } from '../../../shared/result';
import * as mir from '../../2-encoding/mir';
import { NormalizationState } from '../context';
import { VISIT_EXPRS } from '../visitors/expressions';
import { keywords } from './impl';
import { assertValidCurryUsage } from './utils/curry';
import { assertValidHasBlockUsage } from './utils/has-block';

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
