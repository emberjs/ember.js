import { BaselineSyntax, compileArgs } from '@glimmer/runtime';
import { unwrap } from '@glimmer/util';

const {
  defaultBlock,
  params,
  hash
} = BaselineSyntax.NestedBlock;

export function _withDynamicVarsMacro(sexp, builder) {
  let block = defaultBlock(sexp);
  let args = compileArgs(params(sexp), hash(sexp), builder);

  builder.unit(b => {
    b.putArgs(args);
    b.pushDynamicScope();
    b.bindDynamicScope(args.named.keys);
    b.evaluate(unwrap(block));
    b.popDynamicScope();
  });
}
