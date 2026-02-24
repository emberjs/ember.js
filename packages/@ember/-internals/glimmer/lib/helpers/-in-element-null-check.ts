import { assert } from '@ember/debug';

import type { CapturedArguments, Helper } from '@glimmer/interfaces';
import { createComputeRef, valueForRef } from '@glimmer/reference';
import { internalHelper } from './internal-helper';

let helper: Helper;

if (import.meta.env?.DEV) {
  helper = (args: CapturedArguments) => {
    const inner = args.positional[0];
    assert('expected at least one positional arg', inner);

    return createComputeRef(() => {
      let value = valueForRef(inner);

      assert(
        'You cannot pass a null or undefined destination element to in-element',
        value !== null && value !== undefined
      );

      return value;
    });
  };
} else {
  helper = (args: CapturedArguments) => {
    let arg = args.positional[0];
    assert('expected at least one positional arg', arg);
    return arg;
  };
}

export default internalHelper(helper);
