import { ASTv2, generateSyntaxError } from '@glimmer/syntax';

import { Err, Ok, Result } from '../../../../shared/result';
import { GenericKeywordNode } from '../impl';

export function assertValidGetDynamicVar(node: GenericKeywordNode): Result<ASTv2.ExpressionNode> {
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
