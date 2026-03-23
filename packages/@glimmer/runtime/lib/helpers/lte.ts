import type { CapturedArguments } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { createComputeRef, valueForRef } from '@glimmer/reference';

import { internalHelper } from './internal-helper';

/**
  Use the `{{lte}}` helper to check if one value is less than or equal to another.

  ```handlebars
  {{if (lte this.count 10) "10 or under" "Over 10"}}
  ```

  Equivalent to `a <= b` in JavaScript.

  @method lte
  @param {Any} a
  @param {Any} b
  @return {Boolean}
  @public
*/
export const lte = internalHelper(({ positional }: CapturedArguments): Reference<boolean> => {
  return createComputeRef(
    () => {
      let a = positional[0] ? valueForRef(positional[0]) : undefined;
      let b = positional[1] ? valueForRef(positional[1]) : undefined;
      return (a as number) <= (b as number);
    },
    null,
    'lte'
  );
});
