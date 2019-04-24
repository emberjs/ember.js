import { HAS_NATIVE_PROXY } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { Arguments, VM } from '@glimmer/runtime';
import { ICapturedArguments } from '@glimmer/runtime/dist/types/lib/vm/arguments';
import { Opaque } from '@glimmer/util';
import { InternalHelperReference } from '../utils/references';

let context: any = null;
if (DEBUG && HAS_NATIVE_PROXY) {
  let assertOnProperty = (property: string | number | symbol) => {
    assert(
      `You accessed \`this.${String(
        property
      )}\` from a function passed to the \`fn\` helper, but the function itself was not bound to a valid \`this\` context. Consider updating to usage of \`@action\`.`
    );
  };

  context = new Proxy(
    {},
    {
      get(_target: {}, property: string | symbol) {
        assertOnProperty(property);
      },

      set(_target: {}, property: string | symbol) {
        assertOnProperty(property);

        return false;
      },

      has(_target: {}, property: string | symbol) {
        assertOnProperty(property);

        return false;
      },
    }
  );
}

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
