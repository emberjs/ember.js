import type { ASTv2 } from '@glimmer/syntax';
import { generateSyntaxError } from '@glimmer/syntax';

import type { Result } from '../../../../shared/result';
import type { NormalizationState } from '../../context';
import type { GenericKeywordNode, KeywordDelegate } from '../impl';

import { Err, Ok } from '../../../../shared/result';
import * as mir from '../../../2-encoding/mir';
import { VISIT_EXPRS } from '../../visitors/expressions';

function assertGetDynamicVarKeyword(node: GenericKeywordNode): Result<ASTv2.ExpressionNode> {
  let call = node.type === 'AppendContent' ? node.value : node;

  let named = call.type === 'Call' ? call.args.named : null;
  let positionals = call.type === 'Call' ? call.args.positional : null;

  if (named && !named.isEmpty()) {
    return Err(
      generateSyntaxError(`(-get-dynamic-vars) does not take any named arguments`, node.loc)
    );
  }

  let varName = positionals?.nth(0);

  if (!varName) {
    return Err(generateSyntaxError(`(-get-dynamic-vars) requires a var name to get`, node.loc));
  }

  if (positionals && positionals.size > 1) {
    return Err(
      generateSyntaxError(`(-get-dynamic-vars) only receives one positional arg`, node.loc)
    );
  }

  return Ok(varName);
}

function translateGetDynamicVarKeyword(
  { node, state }: { node: GenericKeywordNode; state: NormalizationState },
  name: ASTv2.ExpressionNode
): Result<mir.GetDynamicVar> {
  return VISIT_EXPRS.visit(name, state).mapOk(
    (name) => new mir.GetDynamicVar({ name, loc: node.loc })
  );
}

export const getDynamicVarKeyword: KeywordDelegate<
  GenericKeywordNode,
  ASTv2.ExpressionNode,
  mir.GetDynamicVar
> = {
  assert: assertGetDynamicVarKeyword,
  translate: translateGetDynamicVarKeyword,
};
