import { type ASTv2, generateSyntaxError } from '@glimmer/syntax';

import { Err, Ok, type Result } from '../../../../shared/result';
import * as mir from '../../../2-encoding/mir';
import { type NormalizationState } from '../../context';
import { VISIT_EXPRS } from '../../visitors/expressions';
import { type GenericKeywordNode, type KeywordDelegate } from '../impl';

function assertLogKeyword(node: GenericKeywordNode): Result<ASTv2.PositionalArguments> {
  let {
    args: { named, positional },
  } = node;

  if (named && !named.isEmpty()) {
    return Err(generateSyntaxError(`(log) does not take any named arguments`, node.loc));
  }

  return Ok(positional);
}

function translateLogKeyword(
  { node, state }: { node: ASTv2.CallExpression; state: NormalizationState },
  positional: ASTv2.PositionalArguments
): Result<mir.Log> {
  return VISIT_EXPRS.Positional(positional, state).mapOk(
    (positional) => new mir.Log({ positional, loc: node.loc })
  );
}

export const logKeyword: KeywordDelegate<
  ASTv2.CallExpression | ASTv2.AppendContent,
  ASTv2.PositionalArguments,
  mir.Log
> = {
  assert: assertLogKeyword,
  translate: translateLogKeyword,
};
