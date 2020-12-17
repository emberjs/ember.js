import { ASTv2, generateSyntaxError } from '@glimmer/syntax';

import { Err, Ok, Result } from '../../../../shared/result';

export function assertValidIfUnlessInlineUsage(type: string, inverted: boolean) {
  return (
    originalNode: ASTv2.AppendContent | ASTv2.ExpressionNode
  ): Result<{
    condition: ASTv2.ExpressionNode;
    truthy: ASTv2.ExpressionNode;
    falsy: ASTv2.ExpressionNode | null;
  }> => {
    let node = originalNode.type === 'AppendContent' ? originalNode.value : originalNode;
    let named = node.type === 'Call' ? node.args.named : null;
    let positional = node.type === 'Call' ? node.args.positional : null;

    if (named && !named.isEmpty()) {
      return Err(
        generateSyntaxError(
          `${type} cannot receive named parameters, received ${named.entries
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
          `When used inline, ${type} requires at least two parameters 1. the condition that determines the state of the ${type}, and 2. the value to return if the condition is ${
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
          `When used inline, ${type} requires at least two parameters 1. the condition that determines the state of the ${type}, and 2. the value to return if the condition is ${
            inverted ? 'false' : 'true'
          }. Received only one parameter, the condition`,
          originalNode.loc
        )
      );
    }

    if (positional.size > 3) {
      return Err(
        generateSyntaxError(
          `When used inline, ${type} can receive a maximum of three positional parameters 1. the condition that determines the state of the ${type}, 2. the value to return if the condition is ${
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
