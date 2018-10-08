import { PathReference } from '@glimmer/reference';
import { Arguments, VM } from '@glimmer/runtime';
import { Opaque } from '@glimmer/util';

/**
@module ember
*/

/**
   Use the `{{array}}` helper to create an array to pass as an option to your
   components.

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
   @category array-helper
   @since 3.7.0
   @public
 */

export default function(_vm: VM, args: Arguments): PathReference<Opaque[]> {
  return args.positional.capture();
}
