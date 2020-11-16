import { ASTv2, GlimmerSyntaxError, SourceSlice } from '@glimmer/syntax';

import { Err, Ok, Result } from '../../../shared/result';
import { GenericKeywordNode } from './impl';

export function assertValidHasBlockUsage(
  type: string,
  node: GenericKeywordNode
): Result<SourceSlice> {
  let call = node.type === 'AppendContent' ? node.value : node;

  let named = call.type === 'Call' ? call.args.named : null;
  let positionals = call.type === 'Call' ? call.args.positional : null;

  if (named && !named.isEmpty()) {
    return Err(new GlimmerSyntaxError(`${type} does not take any named arguments`, call.loc));
  }

  if (!positionals || positionals.isEmpty()) {
    return Ok(SourceSlice.synthetic('default'));
  } else if (positionals.exprs.length === 1) {
    let positional = positionals.exprs[0];
    if (ASTv2.isLiteral(positional, 'string')) {
      return Ok(positional.toSlice());
    } else {
      return Err(new GlimmerSyntaxError(`you can only yield to a literal value`, call.loc));
    }
  } else {
    return Err(new GlimmerSyntaxError(`${type} only takes a single positional argument`, call.loc));
  }
}
