import type { CapturedArguments } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { createComputeRef, valueForRef } from '@glimmer/reference';

import { internalHelper } from './internal-helper';

/**
  Use the `{{lt}}` helper to check if one value is less than another.

  ```handlebars
  {{if (lt this.count 10) "Under 10" "10 or more"}}
  ```

  Equivalent to `a < b` in JavaScript.

  @method lt
  @param {Any} a
  @param {Any} b
  @return {Boolean}
  @public
*/
export const lt = internalHelper(({ positional }: CapturedArguments): Reference<boolean> => {
  return createComputeRef(
    () => {
      let a = positional[0] ? valueForRef(positional[0]) : undefined;
      let b = positional[1] ? valueForRef(positional[1]) : undefined;
      return (a as number) < (b as number);
    },
    null,
    'lt'
  );
});
