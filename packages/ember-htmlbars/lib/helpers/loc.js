import Ember from 'ember-metal/core';
import { loc } from 'ember-runtime/system/string';
import { isStream } from "ember-metal/streams/utils";

/**
@module ember
@submodule ember-htmlbars
*/

/**
  Calls [Ember.String.loc](/api/classes/Ember.String.html#method_loc) with the
  provided string.

  This is a convenient way to localize text within a template:

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
  @for Ember.Handlebars.helpers
  @param {String} str The string to format
  @see {Ember.String#loc}
*/
export function locHelper(params, hash, options, env) {
  Ember.assert('You cannot pass bindings to `loc` helper', (function ifParamsContainBindings() {
    for (var i = 0, l = params.length; i < l; i++) {
      if (isStream(params[i])) {
        return false;
      }
    }
    return true;
  })());

  return loc.apply(env.data.view, params);
}
