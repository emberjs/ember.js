import { loc } from "ember-runtime/system/string";

/**
@module ember
@submodule ember-handlebars
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

  If you use the unquoted notation, Ember will look for the attribute in the
  current context and localize the value of this attribute. As this helper
  doesn’t create any view, the value cannot be bound.

  ```handlebars
  <div class='message'>
    {{loc welcomeMessage}}
  </div>
  ```

  See [Ember.String.loc](/api/classes/Ember.String.html#method_loc) for how to
  set up localized string references.

  @method loc
  @for Ember.Handlebars.helpers
  @param {String} str The string to format
  @see {Ember.String#loc}
*/

var slice = [].slice;

export default function() {
  var types = slice.call(arguments, -1)[0].types;
  var params = slice.call(arguments, 0, -1);

  var str = params.shift();

  if (types.shift() === 'ID') {
    str = this.get(str);
  }

  var length = params.length;
  if (length) {
    var formats = [];

    while (length--) {
      if (types.shift() === 'ID') {
        formats.push(this.get(params.shift()));
      } else {
        formats.push(params.shift());
      }
    }
    return loc(str, formats);

  } else {
    return loc(str);
  }
}
