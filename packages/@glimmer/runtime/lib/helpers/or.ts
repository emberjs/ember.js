import type { CapturedArguments } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { createComputeRef, valueForRef } from '@glimmer/reference';

import { internalHelper } from './internal-helper';

/**
  Use the `{{or}}` helper to perform logical OR across multiple values.

  ```handlebars
  {{if (or this.isAdmin this.isModerator) "Has access" "No access"}}
  ```

  Returns the first truthy value (short-circuits), or the last value if all are falsy.

  @method or
  @param {Any} ...values
  @return {Any}
  @public
*/
export const or = internalHelper(({ positional }: CapturedArguments): Reference => {
  return createComputeRef(
    () => {
      let last: unknown;
      for (let i = 0; i < positional.length; i++) {
        let ref = positional[i];
        last = ref ? valueForRef(ref) : undefined;
        if (last) return last;
      }
      return last;
    },
    null,
    'or'
  );
});
