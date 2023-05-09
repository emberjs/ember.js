import { CurriedType } from '@glimmer/interfaces';
import { ASTv2, generateSyntaxError, src } from '@glimmer/syntax';

import { Err, Ok, Result } from '../../../shared/result';
import * as mir from '../../2-encoding/mir';
import { type NormalizationState } from '../context';
import { VISIT_EXPRS } from '../visitors/expressions';
import { keywords } from './impl';
import { toAppend } from './utils/call-to-append';
import { assertCurryKeyword } from './utils/curry';
import { getDynamicVarKeyword } from './utils/dynamic-vars';
import { hasBlockKeyword } from './utils/has-block';
import { ifUnlessInlineKeyword } from './utils/if-unless';
import { logKeyword } from './utils/log';

export const APPEND_KEYWORDS = keywords('Append')
  .kw('has-block', toAppend(hasBlockKeyword('has-block')))
  .kw('has-block-params', toAppend(hasBlockKeyword('has-block-params')))
  .kw('-get-dynamic-var', toAppend(getDynamicVarKeyword))
  .kw('log', toAppend(logKeyword))
  .kw('if', toAppend(ifUnlessInlineKeyword('if')))
  .kw('unless', toAppend(ifUnlessInlineKeyword('unless')))
  .kw('yield', {
    assert(node: ASTv2.AppendContent): Result<{
      target: src.SourceSlice;
      positional: ASTv2.PositionalArguments;
    }> {
      let { args } = node;

      if (args.named.isEmpty()) {
        return Ok({
          target: src.SourceSpan.synthetic('default').toSlice(),
          positional: args.positional,
        });
      } else {
        let target = args.named.get('to');

        if (args.named.size > 1 || target === null) {
          return Err(
            generateSyntaxError(`yield only takes a single named argument: 'to'`, args.named.loc)
          );
        }

        if (ASTv2.isLiteral(target, 'string')) {
          return Ok({ target: target.toSlice(), positional: args.positional });
        } else {
          return Err(
            generateSyntaxError(`you can only yield to a literal string value`, target.loc)
          );
        }
      }
    },

    translate(
      { node, state }: { node: ASTv2.AppendContent; state: NormalizationState },
      {
        target,
        positional,
      }: {
        target: src.SourceSlice;
        positional: ASTv2.PositionalArguments;
      }
    ): Result<mir.Statement> {
      return VISIT_EXPRS.Positional(positional, state).mapOk(
        (positional) =>
          new mir.Yield({
            loc: node.loc,
            target,
            to: state.scope.allocateBlock(target.chars),
            positional,
          })
      );
    },
  })
  .kw('debugger', {
    assert(node: ASTv2.AppendContent): Result<void> {
      let { args } = node;
      let { positional } = args;

      if (args.isEmpty()) {
        return Ok(undefined);
      } else {
        if (positional.isEmpty()) {
          return Err(generateSyntaxError(`debugger does not take any named arguments`, node.loc));
        } else {
          return Err(
            generateSyntaxError(`debugger does not take any positional arguments`, node.loc)
          );
        }
      }
    },

    translate({
      node,
      state: { scope },
    }: {
      node: ASTv2.AppendContent;
      state: NormalizationState;
    }): Result<mir.Statement> {
      scope.setHasDebugger();
      return Ok(new mir.Debugger({ loc: node.loc, scope }));
    },
  })
  .kw('component', {
    assert: assertCurryKeyword(CurriedType.Component),

    translate(
      { node, state }: { node: ASTv2.AppendContent; state: NormalizationState },
      { definition, args }: { definition: ASTv2.ExpressionNode; args: ASTv2.Args }
    ): Result<mir.InvokeComponent> {
      let definitionResult = VISIT_EXPRS.visit(definition, state);
      let argsResult = VISIT_EXPRS.Args(args, state);

      return Result.all(definitionResult, argsResult).mapOk(
        ([definition, args]) =>
          new mir.InvokeComponent({
            loc: node.loc,
            definition,
            args,
            blocks: null,
          })
      );
    },
  })
  .kw('helper', {
    assert: assertCurryKeyword(CurriedType.Helper),

    translate(
      { node, state }: { node: ASTv2.AppendContent; state: NormalizationState },
      { definition, args }: { definition: ASTv2.ExpressionNode; args: ASTv2.Args }
    ): Result<mir.AppendTextNode> {
      let definitionResult = VISIT_EXPRS.visit(definition, state);
      let argsResult = VISIT_EXPRS.Args(args, state);

      return Result.all(definitionResult, argsResult).mapOk(([definition, args]) => {
        let text = new mir.CallExpression({ callee: definition, args, loc: node.loc });

        return new mir.AppendTextNode({
          loc: node.loc,
          text,
        });
      });
    },
  });
