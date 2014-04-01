import {loc} from "ember-runtime/system/string";

/**
@module ember
@submodule ember-handlebars
*/

// ES6TODO:
// Pretty sure this can be expressed as
// var locHelper EmberStringUtils.loc ?

/**
  `loc` looks up the string in the localized strings hash.
  This is a convenient way to localize text. For example:

  ```html
  <script type="text/x-handlebars" data-template-name="home">
    {{loc "welcome"}}
  </script>
  ```

  Take note that `"welcome"` is a string and not an object
  reference.

  @method loc
  @for Ember.Handlebars.helpers
  @param {String} str The string to format
*/
function locHelper(str) {
  return loc(str);
}

export default locHelper;
