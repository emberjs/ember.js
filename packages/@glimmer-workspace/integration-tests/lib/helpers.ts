import type { CapturedArguments, Dict } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { setLocalDebugType } from '@glimmer/debug-util';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { createComputeRef } from '@glimmer/reference';
import { reifyNamed, reifyPositional } from '@glimmer/runtime';

export type UserHelper = (args: ReadonlyArray<unknown>, named: Dict<unknown>) => unknown;

export function createHelperRef(helper: UserHelper, args: CapturedArguments): Reference {
  return createComputeRef(
    () => helper(reifyPositional(args.positional), reifyNamed(args.named)),
    undefined
  );
}

if (LOCAL_DEBUG) {
  setLocalDebugType('factory:helper', createHelperRef, { name: 'createHelper' });
}
