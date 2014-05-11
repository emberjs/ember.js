import { loc } from "ember-runtime/system/string";

/**
@module ember
@submodule ember-handlebars
*/

// ES6TODO:
// Pretty sure this can be expressed as
// var locHelper EmberStringUtils.loc ?

/**
  Calls [Ember.String.loc](/api/classes/Ember.String.html#method_loc) with the
  provided string.

  This is a convenient way to localize text. For example:

  ```html
  <script type="text/x-handlebars" data-template-name="home">
    {{loc "welcome"}}
  </script>
  ```

  Take note that `"welcome"` is a string and not an object
  reference.

  See [Ember.String.loc](/api/classes/Ember.String.html#method_loc) for how to 
  set up localized string references.

  @method loc
  @for Ember.Handlebars.helpers
  @param {String} str The string to format
  @see {Ember.String#loc}
*/
export default function locHelper(str) {
  return loc(str);
}
