import type { CapturedArguments } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { createComputeRef, valueForRef } from '@glimmer/reference';

import { internalHelper } from './internal-helper';

/**
  Use the `{{not}}` helper to negate a value using Handlebars truthiness.

  ```handlebars
  {{if (not this.isActive) "Inactive" "Active"}}
  ```

  Returns `true` for falsy values, `false` for truthy values.

  @method not
  @param {Any} value
  @return {Boolean}
  @public
*/
export const not = internalHelper(({ positional }: CapturedArguments): Reference<boolean> => {
  return createComputeRef(
    () => {
      let value = positional[0] ? valueForRef(positional[0]) : undefined;
      return !value;
    },
    null,
    'not'
  );
});
