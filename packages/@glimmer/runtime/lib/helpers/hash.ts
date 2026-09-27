import type { CapturedArguments, Dict } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import { createComputeRef } from '@glimmer/reference/lib/reference';

import { reifyNamed } from '../vm/arguments';
import { internalHelper } from './internal-helper';

export const hash = internalHelper(({ named }: CapturedArguments): Reference<Dict> => {
  let ref = createComputeRef(
    () => {
      return reifyNamed(named);
    },
    null,
    'hash'
  );

  // Setup the children so that templates can bypass getting the value of
  // the reference and treat children lazily
  let children = new Map();

  for (let name in named) {
    children.set(name, named[name]);
  }

  ref.children = children;

  return ref;
});
