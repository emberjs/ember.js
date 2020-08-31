import { getDebugName } from '@ember/-internals/utils';
import { debugFreeze } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { CapturedArguments } from '@glimmer/interfaces';
import { createComputeRef, Reference } from '@glimmer/reference';
import { reifyArgs } from '@glimmer/runtime';
import { consumeTag, deprecateMutationsInTrackingTransaction } from '@glimmer/validator';
import { HelperInstance, isClassHelper, RECOMPUTE_TAG, SimpleHelper } from '../helper';

export function createHelperRef<T = unknown>(
  helper: SimpleHelper<T> | HelperInstance<T>,
  args: CapturedArguments
): Reference<T> {
  return createComputeRef(
    () => {
      let { positional, named } = reifyArgs(args);

      let ret: T;

      if (DEBUG) {
        debugFreeze(positional);
        debugFreeze(named);

        deprecateMutationsInTrackingTransaction!(() => {
          ret = helper.compute(positional, named);
        });
      } else {
        ret = helper.compute(positional, named);
      }

      if (helper[RECOMPUTE_TAG]) {
        consumeTag(helper[RECOMPUTE_TAG]);
      }

      return ret!;
    },
    null,
    DEBUG && (isClassHelper(helper) ? getDebugName!(helper) : getDebugName!(helper.compute))
  );
}
