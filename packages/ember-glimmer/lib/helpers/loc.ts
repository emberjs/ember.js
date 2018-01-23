
/**
@module ember
*/

import { helper } from '../helper';
import { String as StringUtils } from 'ember-runtime';

/**
  Calls [loc](/api/ember/release/classes/String/methods/loc?anchor=loc) with the
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

  See [Ember.String.loc](/api/ember/release/classes/String/methods/loc?anchor=loc) for how to
  set up localized string references.

  @method loc
  @for Ember.Templates.helpers
  @param {String} str The string to format.
  @see {Ember.String#loc}
  @public
*/
export default helper(function (params) {
  return StringUtils.loc.apply(null, params);
});
