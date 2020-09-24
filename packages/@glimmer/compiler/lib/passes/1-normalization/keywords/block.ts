import { ASTv2, GlimmerSyntaxError } from '@glimmer/syntax';

import { Err, Ok, Result } from '../../../shared/result';
import * as mir from '../../2-encoding/mir';
import { NormalizationState } from '../context';
import { VISIT_EXPRS } from '../visitors/expressions';
import { VISIT_STMTS } from '../visitors/statements';
import { keywords } from './impl';

export const BLOCK_KEYWORDS = keywords('Block').kw('in-element', {
  assert(
    node: ASTv2.InvokeBlock
  ): Result<{
    insertBefore: ASTv2.ExpressionNode | null;
    destination: ASTv2.ExpressionNode;
  }> {
    let { args } = node;

    let guid = args.get('guid');

    if (guid) {
      return Err(new GlimmerSyntaxError(`Cannot pass \`guid\` to \`{{#in-element}}\``, guid.loc));
    }

    let insertBefore = args.get('insertBefore');
    let destination = args.nth(0);

    if (destination === null) {
      return Err(
        new GlimmerSyntaxError(
          `#in-element requires a target element as its first positional parameter`,
          args.loc
        )
      );
    }

    // TODO Better syntax checks

    return Ok({ insertBefore, destination });
  },

  translate(
    { node, state }: { node: ASTv2.InvokeBlock; state: NormalizationState },
    {
      insertBefore,
      destination,
    }: { insertBefore: ASTv2.ExpressionNode | null; destination: ASTv2.ExpressionNode }
  ): Result<mir.InElement> {
    let named = node.blocks.get('default');
    let body = VISIT_STMTS.NamedBlock(named, state);
    let destinationResult = VISIT_EXPRS.visit(destination, state);

    return Result.all(body, destinationResult)
      .andThen(
        ([body, destination]): Result<{
          body: mir.NamedBlock;
          destination: mir.ExpressionNode;
          insertBefore: mir.ExpressionNode;
        }> => {
          if (insertBefore) {
            return VISIT_EXPRS.visit(insertBefore, state).mapOk((insertBefore) => ({
              body,
              destination,
              insertBefore,
            }));
          } else {
            return Ok({
              body,
              destination,
              insertBefore: new mir.Missing({
                loc: node.callee.loc.collapse('end'),
              }),
            });
          }
        }
      )
      .mapOk(
        ({ body, destination, insertBefore }) =>
          new mir.InElement({
            loc: node.loc,
            block: body,
            insertBefore,
            guid: state.generateUniqueCursor(),
            destination,
          })
      );
  },
});
