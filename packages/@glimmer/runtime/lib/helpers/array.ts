import { CapturedArguments } from '@glimmer/interfaces';
import { createComputeRef, Reference } from '@glimmer/reference';
import { internalHelper } from './internal-helper';
import { reifyPositional } from '../vm/arguments';

/**
   Use the `{{array}}` helper to create an array to pass as an option to your
   components.

   ```handlebars
   <MyComponent @people={{array
     'Tom Dale'
     'Yehuda Katz'
     this.myOtherPerson}}
   />
   ```
    or
   ```handlebars
   {{my-component people=(array
     'Tom Dale'
     'Yehuda Katz'
     this.myOtherPerson)
   }}
   ```

   Would result in an object such as:

   ```js
   ['Tom Dale', 'Yehuda Katz', this.get('myOtherPerson')]
   ```

   Where the 3rd item in the array is bound to updates of the `myOtherPerson` property.

   @method array
   @param {Array} options
   @return {Array} Array
   @public
 */

export default internalHelper(({ positional }: CapturedArguments): Reference<unknown[]> => {
  return createComputeRef(() => reifyPositional(positional), null, 'array');
});
