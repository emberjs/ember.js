import type { CapturedArguments, Dict } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { createComputeRef } from '@glimmer/reference';
import { reifyNamed, reifyPositional } from '@glimmer/runtime';

export type UserHelper = (args: ReadonlyArray<unknown>, named: Dict<unknown>) => unknown;

export function createHelperRef(helper: UserHelper, args: CapturedArguments): Reference {
  return createComputeRef(() => helper(reifyPositional(args.positional), reifyNamed(args.named)));
}
