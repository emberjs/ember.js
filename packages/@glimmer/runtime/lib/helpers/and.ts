import type { CapturedArguments } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { createComputeRef, valueForRef } from '@glimmer/reference';

import { internalHelper } from './internal-helper';

/**
  Use the `{{and}}` helper to perform logical AND across multiple values.

  ```handlebars
  {{if (and this.isActive this.isVerified) "Ready" "Not ready"}}
  ```

  Returns the first falsy value (short-circuits), or the last value if all are truthy.

  @method and
  @param {Any} ...values
  @return {Any}
  @public
*/
export const and = internalHelper(({ positional }: CapturedArguments): Reference => {
  return createComputeRef(
    () => {
      let last: unknown;
      for (let i = 0; i < positional.length; i++) {
        let ref = positional[i];
        last = ref ? valueForRef(ref) : undefined;
        if (!last) return last;
      }
      return last;
    },
    null,
    'and'
  );
});
