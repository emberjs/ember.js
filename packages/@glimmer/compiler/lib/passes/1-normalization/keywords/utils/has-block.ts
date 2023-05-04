import { ASTv2, generateSyntaxError, SourceSlice } from '@glimmer/syntax';

import { Err, Ok, Result } from '../../../../shared/result';
import * as mir from '../../../2-encoding/mir';
import { NormalizationState } from '../../context';
import { GenericKeywordNode, KeywordDelegate } from '../impl';

function assertHasBlockKeyword(type: string) {
  return (node: GenericKeywordNode): Result<SourceSlice> => {
    let call = node.type === 'AppendContent' ? node.value : node;

    let named = call.type === 'Call' ? call.args.named : null;
    let positionals = call.type === 'Call' ? call.args.positional : null;

    if (named && !named.isEmpty()) {
      return Err(generateSyntaxError(`(${type}) does not take any named arguments`, call.loc));
    }

    if (!positionals || positionals.isEmpty()) {
      return Ok(SourceSlice.synthetic('default'));
    } else if (positionals.exprs.length === 1) {
      let positional = positionals.exprs[0] as ASTv2.ExpressionNode;
      if (ASTv2.isLiteral(positional, 'string')) {
        return Ok(positional.toSlice());
      } else {
        return Err(
          generateSyntaxError(
            `(${type}) can only receive a string literal as its first argument`,
            call.loc
          )
        );
      }
    } else {
      return Err(
        generateSyntaxError(`(${type}) only takes a single positional argument`, call.loc)
      );
    }
  };
}

function translateHasBlockKeyword(type: string) {
  return (
    { node, state: { scope } }: { node: ASTv2.CallExpression; state: NormalizationState },
    target: SourceSlice
  ): Result<mir.HasBlock | mir.HasBlockParams> => {
    let block =
      type === 'has-block'
        ? new mir.HasBlock({ loc: node.loc, target, symbol: scope.allocateBlock(target.chars) })
        : new mir.HasBlockParams({
            loc: node.loc,
            target,
            symbol: scope.allocateBlock(target.chars),
          });

    return Ok(block);
  };
}

export function hasBlockKeyword(
  type: string
): KeywordDelegate<
  ASTv2.CallExpression | ASTv2.AppendContent,
  SourceSlice,
  mir.HasBlock | mir.HasBlockParams
> {
  return {
    assert: assertHasBlockKeyword(type),
    translate: translateHasBlockKeyword(type),
  };
}
