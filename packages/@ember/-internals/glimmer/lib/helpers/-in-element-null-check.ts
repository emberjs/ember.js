import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { CapturedArguments, Helper } from '@glimmer/interfaces';
import { createComputeRef, valueForRef } from '@glimmer/reference';
import { internalHelper } from './internal-helper';

let helper: Helper;

if (DEBUG) {
  helper = (args: CapturedArguments) => {
    let inner = args.positional[0];

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
  helper = (args: CapturedArguments) => args.positional[0];
}

export default internalHelper(helper);
