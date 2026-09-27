import { DEBUG } from '@glimmer/env';
import type { AnyFn, CapturedArguments } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import { check } from '@glimmer/debug/lib/stack-check';
import buildUntouchableThis from '@glimmer/debug-util/lib/untouchable-this';
import {
  createComputeRef,
  isInvokableRef,
  updateRef,
  valueForRef,
} from '@glimmer/reference/lib/reference';

import { reifyPositional } from '../vm/arguments';
import { internalHelper } from './internal-helper';

const context = buildUntouchableThis('`fn` helper');

export const fn = internalHelper(({ positional }: CapturedArguments) => {
  let callbackRef = check(positional[0], assertCallbackIsFn);

  return createComputeRef(
    () => {
      return (...invocationArgs: unknown[]) => {
        let [fn, ...args] = reifyPositional(positional);

        if (DEBUG) assertCallbackIsFn(callbackRef);

        if (isInvokableRef(callbackRef)) {
          let value = args.length > 0 ? args[0] : invocationArgs[0];
          return void updateRef(callbackRef, value);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- @fixme
          return (fn as AnyFn).call(context, ...args, ...invocationArgs);
        }
      };
    },
    null,
    'fn'
  );
});

function assertCallbackIsFn(callbackRef: Reference | undefined): asserts callbackRef is Reference {
  if (
    !(
      callbackRef &&
      (isInvokableRef(callbackRef) || typeof valueForRef(callbackRef) === 'function')
    )
  ) {
    throw new Error(
      `You must pass a function as the \`fn\` helper's first argument, you passed ${
        callbackRef ? valueForRef(callbackRef) : callbackRef
      }. While rendering:\n\n${callbackRef?.debugLabel}`
    );
  }
}
