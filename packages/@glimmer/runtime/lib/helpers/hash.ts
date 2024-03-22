import type { CapturedArguments, Dict } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { createComputeRef } from '@glimmer/reference';

import { reifyNamed } from '../vm/arguments';
import { internalHelper } from './internal-helper';

/**
   Use the `{{hash}}` helper to create a hash to pass as an option to your
   components. This is specially useful for contextual components where you can
   just yield a hash:

   ```handlebars
   {{yield (hash
      name='Sarah'
      title=office
   )}}
   ```

   Would result in an object such as:

   ```js
   { name: 'Sarah', title: this.get('office') }
   ```

   Where the `title` is bound to updates of the `office` property.

   Note that the hash is an empty object with no prototype chain, therefore
   common methods like `toString` are not available in the resulting hash.
   If you need to use such a method, you can use the `call` or `apply`
   approach:

   ```js
   function toString(obj) {
     return Object.prototype.toString.apply(obj);
   }
   ```

   @method hash
   @param {Object} options
   @return {Object} Hash
   @public
 */
export const hash = internalHelper(({ named }: CapturedArguments): Reference<Dict<unknown>> => {
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
