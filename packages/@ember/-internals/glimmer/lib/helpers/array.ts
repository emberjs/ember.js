import { VMArguments } from '@glimmer/interfaces';
import { createComputeRef, Reference } from '@glimmer/reference';
import { reifyPositional } from '@glimmer/runtime';
import { internalHelper } from './internal-helper';

/**
@module ember
*/

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
   @for Ember.Templates.helpers
   @param {Array} options
   @return {Array} Array
   @since 3.8.0
   @public
 */

export default internalHelper(
  (args: VMArguments): Reference<unknown[]> => {
    let captured = args.positional.capture();

    return createComputeRef(() => reifyPositional(captured), null, 'array');
  }
);
