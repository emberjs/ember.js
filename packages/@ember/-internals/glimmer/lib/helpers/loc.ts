/**
@module ember
*/

import { loc } from '@ember/string';
import { helper } from '../helper';

/**
  Calls [loc](/api/classes/Ember.String.html#method_loc) with the
  provided string. This is a convenient way to localize text within a template.
  For example:

  ```javascript
  Ember.STRINGS = {
    '_welcome_': 'Bonjour'
  };
  ```

  ```handlebars
  <div class='message'>
    {{loc '_welcome_'}}
  </div>
  ```

  ```html
  <div class='message'>
    Bonjour
  </div>
  ```

  See [String.loc](/api/ember/release/classes/String/methods/loc?anchor=loc) for how to
  set up localized string references.

  @method loc
  @for Ember.Templates.helpers
  @param {String} str The string to format.
  @see {String#loc}
  @public
*/
export default helper(function(params) {
  return loc.apply(null, params);
});
