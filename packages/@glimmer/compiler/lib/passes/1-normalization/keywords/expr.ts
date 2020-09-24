import { SourceSlice } from '@glimmer/syntax';

import { Ok, Result } from '../../../shared/result';
import * as mir from '../../2-encoding/mir';
import { NormalizationState } from '../context';
import { assertValidHasBlockUsage } from './has-block';
import { ExprKeywordNode, keywords } from './impl';

export const EXPR_KEYWORDS = keywords('Expr')
  .kw('has-block', {
    assert(node: ExprKeywordNode): Result<SourceSlice> {
      return assertValidHasBlockUsage('has-block', node);
    },
    translate(
      { node, state: { scope } }: { node: ExprKeywordNode; state: NormalizationState },
      target: SourceSlice
    ): Result<mir.HasBlock> {
      return Ok(
        new mir.HasBlock({ loc: node.loc, target, symbol: scope.allocateBlock(target.chars) })
      );
    },
  })
  .kw('has-block-params', {
    assert(node: ExprKeywordNode): Result<SourceSlice> {
      return assertValidHasBlockUsage('has-block-params', node);
    },
    translate(
      { node, state: { scope } }: { node: ExprKeywordNode; state: NormalizationState },
      target: SourceSlice
    ): Result<mir.HasBlockParams> {
      return Ok(
        new mir.HasBlockParams({ loc: node.loc, target, symbol: scope.allocateBlock(target.chars) })
      );
    },
  });
