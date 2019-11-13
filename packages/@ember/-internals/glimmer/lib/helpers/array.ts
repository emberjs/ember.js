import { PathReference } from '@glimmer/reference';
import { Arguments, VM } from '@glimmer/runtime';

/**
@module ember
*/

/**
   Use the `{{array}}` helper to create an array to pass as an option to your
   components.

   ```handlebars
   <MyComponent @people={{array
     'Tom Dade'
     'Yehuda Katz'
     this.myOtherPerson}}
   />
   ```
    or
   ```handlebars
   {{my-component people=(array
     'Tom Dade'
     'Yehuda Katz'
     this.myOtherPerson)
   }}
   ```

   Would result in an object such as:

   ```js
   ['Tom Date', 'Yehuda Katz', this.get('myOtherPerson')]
   ```

   Where the 3rd item in the array is bound to updates of the `myOtherPerson` property.

   @method array
   @for Ember.Templates.helpers
   @param {Array} options
   @return {Array} Array
   @since 3.8.0
   @public
 */

export default function(_vm: VM, args: Arguments): PathReference<unknown[]> {
  return args.positional.capture();
}
