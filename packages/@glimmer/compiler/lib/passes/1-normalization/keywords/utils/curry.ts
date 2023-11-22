import type { CurriedType } from '@glimmer/interfaces';
import { ASTv2, generateSyntaxError } from '@glimmer/syntax';
import { CurriedTypes } from '@glimmer/vm';

import type { NormalizationState } from '../../context';
import type { KeywordDelegate } from '../impl';

import { Err, Ok, Result } from '../../../../shared/result';
import * as mir from '../../../2-encoding/mir';
import { VISIT_EXPRS } from '../../visitors/expressions';

const CurriedTypeToReadableType = {
  [CurriedTypes.Component]: 'component',
  [CurriedTypes.Helper]: 'helper',
  [CurriedTypes.Modifier]: 'modifier',
} as const;

export function assertCurryKeyword(curriedType: CurriedType) {
  return (
    node: ASTv2.AppendContent | ASTv2.InvokeBlock | ASTv2.CallExpression,
    state: NormalizationState
  ): Result<{
    definition: ASTv2.ExpressionNode;
    args: ASTv2.Args;
  }> => {
    let readableType = CurriedTypeToReadableType[curriedType];
    let stringsAllowed = curriedType === CurriedTypes.Component;

    let { args } = node;

    let definition = args.nth(0);

    if (definition === null) {
      return Err(
        generateSyntaxError(
          `(${readableType}) requires a ${readableType} definition or identifier as its first positional parameter, did not receive any parameters.`,
          args.loc
        )
      );
    }

    if (definition.type === 'Literal') {
      if (stringsAllowed && state.isStrict) {
        return Err(
          generateSyntaxError(
            `(${readableType}) cannot resolve string values in strict mode templates`,
            node.loc
          )
        );
      } else if (!stringsAllowed) {
        return Err(
          generateSyntaxError(
            `(${readableType}) cannot resolve string values, you must pass a ${readableType} definition directly`,
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

function translateCurryKeyword(curriedType: CurriedType) {
  return (
    {
      node,
      state,
    }: { node: ASTv2.CallExpression | ASTv2.AppendContent; state: NormalizationState },
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

export function curryKeyword(
  curriedType: CurriedType
): KeywordDelegate<
  ASTv2.CallExpression | ASTv2.AppendContent,
  { definition: ASTv2.ExpressionNode; args: ASTv2.Args },
  mir.Curry
> {
  return {
    assert: assertCurryKeyword(curriedType),
    translate: translateCurryKeyword(curriedType),
  };
}
