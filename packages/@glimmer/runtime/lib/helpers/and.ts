import { DEBUG } from '@glimmer/env';
import type { CapturedArguments } from '@glimmer/interfaces';
import { toBool } from '@glimmer/global-context';
import { createComputeRef, valueForRef } from '@glimmer/reference';

import { internalHelper } from './internal-helper';

export const and = internalHelper(({ positional }: CapturedArguments) => {
  if (DEBUG && positional.length < 2) {
    throw new Error(`\`and\` expects at least two arguments, but received ${positional.length}.`);
  }

  return createComputeRef(
    () => {
      let last: unknown;
      for (let i = 0; i < positional.length; i++) {
        let arg = positional[i];
        last = arg ? valueForRef(arg) : arg;
        if (!toBool(last)) return last;
      }
      return last;
    },
    null,
    'and'
  );
});
