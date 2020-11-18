import { ASTv2, generateSyntaxError, SourceSlice } from '@glimmer/syntax';

import { Err, Ok, Result } from '../../../shared/result';
import * as mir from '../../2-encoding/mir';
import { NormalizationState } from '../context';
import { VISIT_EXPRS } from '../visitors/expressions';
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
  })
  .kw('component', {
    assert(node: ExprKeywordNode): Result<{ definition: ASTv2.ExpressionNode; args: ASTv2.Args }> {
      if (node.type !== 'Call') {
        return Err(
          generateSyntaxError(
            'The (component) keyword must be called with arguments in order to curry a component definition. It cannot be used directly as a value.',
            node.loc
          )
        );
      }

      let { args } = node;
      let definition = args.nth(0);

      if (definition === null) {
        return Err(
          generateSyntaxError(
            `(component) requires a component definition or identifier as its first positional parameter, did not receive any parameters.`,
            args.loc
          )
        );
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
    },

    translate(
      { node, state }: { node: ExprKeywordNode; state: NormalizationState },
      { definition, args }: { definition: ASTv2.ExpressionNode; args: ASTv2.Args }
    ): Result<mir.CurryComponent> {
      let definitionResult = VISIT_EXPRS.visit(definition, state);
      let argsResult = VISIT_EXPRS.Args(args, state);

      return Result.all(definitionResult, argsResult).mapOk(
        ([definition, args]) =>
          new mir.CurryComponent({
            loc: node.loc,
            definition,
            args,
          })
      );
    },
  });
