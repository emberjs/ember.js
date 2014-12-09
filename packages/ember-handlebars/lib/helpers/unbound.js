/**
@module ember
@submodule ember-handlebars
*/

import EmberHandlebars from "ember-handlebars-compiler";

import { resolveHelper } from "ember-handlebars/helpers/binding";

/**
  `unbound` allows you to output a property without binding. *Important:* The
  output will not be updated if the property changes. Use with caution.

  ```handlebars
  <div>{{unbound somePropertyThatDoesntChange}}</div>
  ```

  `unbound` can also be used in conjunction with a bound helper to
  render it in its unbound form:

  ```handlebars
  <div>{{unbound helperName somePropertyThatDoesntChange}}</div>
  ```

  @method unbound
  @for Ember.Handlebars.helpers
  @param {String} property
  @return {String} HTML string
*/
export default function unboundHelper(property) {
  var argsLength = arguments.length;
  var options = arguments[argsLength - 1];
  var view = options.data.view;
  var container = view.container;

  if (argsLength <= 2) {
    return view.getStream(property).value();
  } else {
    options.data.isUnbound = true;
    options.types.shift();

    var args = new Array(argsLength - 1);
    for (var i = 1; i < argsLength; i++) {
      args[i - 1] = arguments[i];
    }

    var helper = resolveHelper(container, property) || EmberHandlebars.helpers.helperMissing;

    // Attempt to exec the first field as a helper
    options.name = arguments[0];

    var result = helper.apply(this, args);

    delete options.data.isUnbound;
    return result;
  }
}
