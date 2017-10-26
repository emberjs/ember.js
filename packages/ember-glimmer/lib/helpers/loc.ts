
/**
@module ember
@submodule ember-glimmer
*/
import { String as StringUtils } from 'ember-runtime';
import { InternalHelperReference } from '../utils/references';

/**
  Calls [Ember.String.loc](/api/classes/Ember.String.html#method_loc) with the
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

  See [Ember.String.loc](/api/classes/Ember.String.html#method_loc) for how to
  set up localized string references.

  @method loc
  @for Ember.Templates.helpers
  @param {String} str The string to format.
  @see {Ember.String#loc}
  @public
*/
function locHelper({ positional }) {
  return StringUtils.loc.apply(null, positional.value());
}

export default function(_vm, args) {
  return new InternalHelperReference(locHelper, args.capture());
}
