import { assert } from '@ember/debug';
import { Arguments, VM } from '@glimmer/runtime';
import { ICapturedArguments } from '@glimmer/runtime/dist/types/lib/vm/arguments';
import { Opaque } from '@glimmer/util';
import { InternalHelperReference } from '../utils/references';
import buildUntouchableThis from '../utils/untouchable-this';

const context = buildUntouchableThis('`fn` helper');
function fnHelper({ positional }: ICapturedArguments) {
  assert(
    `You must pass a function as the \`fn\` helpers first argument, you passed ${positional
      .at(0)
      .value()}`,
    typeof positional.at(0).value() === 'function'
  );

  return (...invocationArgs: Opaque[]) => {
    let [fn, ...args] = positional.value();

    return fn!['call'](context, ...args, ...invocationArgs);
  };
}

export default function(_vm: VM, args: Arguments) {
  return new InternalHelperReference(fnHelper, args.capture());
}
