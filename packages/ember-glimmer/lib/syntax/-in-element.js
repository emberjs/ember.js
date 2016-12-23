import { BaselineSyntax, compileArgs } from '@glimmer/runtime';
import { unwrap } from '@glimmer/util';

const {
  defaultBlock,
  params,
  hash
} = BaselineSyntax.NestedBlock;

export function _inElementMacro(sexp, builder) {
  let block = defaultBlock(sexp);
  let args = compileArgs(params(sexp), hash(sexp), builder);

  builder.putArgs(args);
  builder.test('simple');

  builder.labelled(null, b => {
    b.jumpUnless('END');
    b.pushRemoteElement();
    b.evaluate(unwrap(block));
    b.popRemoteElement();
  });
}
