import type { CapturedArguments } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import { createComputeRef } from '@glimmer/reference/lib/reference';

import { reifyPositional } from '../vm/arguments';
import { internalHelper } from './internal-helper';

export const array = internalHelper(({ positional }: CapturedArguments): Reference<unknown[]> => {
  return createComputeRef(() => reifyPositional(positional), null, 'array');
});
