import { ASTv2, generateSyntaxError } from '@glimmer/syntax';

import { Err, Ok, Result } from '../../../../shared/result';
import { NormalizationState } from '../../context';

export function assertValidCurryUsage(
  type: string,
  unformattedType: string,
  stringsAllowed: boolean
) {
  return (
    node: ASTv2.AppendContent | ASTv2.InvokeBlock | ASTv2.CallExpression,
    state: NormalizationState
  ): Result<{
    definition: ASTv2.ExpressionNode;
    args: ASTv2.Args;
  }> => {
    let { args } = node;

    let definition = args.nth(0);

    if (definition === null) {
      return Err(
        generateSyntaxError(
          `${type} requires a ${unformattedType} definition or identifier as its first positional parameter, did not receive any parameters.`,
          args.loc
        )
      );
    }

    if (definition.type === 'Literal') {
      if (stringsAllowed && state.isStrict) {
        return Err(
          generateSyntaxError(
            `${type} cannot resolve string values in strict mode templates`,
            node.loc
          )
        );
      } else if (!stringsAllowed) {
        return Err(
          generateSyntaxError(
            `${type} cannot resolve string values, you must pass a ${unformattedType} definition directly`,
            node.loc
          )
        );
      }
    }

    args = new ASTv2.Args({
      positional: new ASTv2.PositionalArguments({
        exprs: args.positional.exprs.slice(1),
        loc: args.positional.loc,
      }),
      named: args.named,
      loc: args.loc,
    });

    return Ok({ definition, args });
  };
}
