/*globals Handlebars */

/**
@module ember
@submodule ember-handlebars
*/

import EmberHandlebars from "ember-handlebars-compiler";
var helpers = EmberHandlebars.helpers;

import {handlebarsGet} from "ember-handlebars/ext";

var slice = [].slice;

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
function unboundHelper(property, fn) {
  var options = arguments[arguments.length - 1], helper, context, out, ctx;

  ctx = this || window;
  if (arguments.length > 2) {
    // Unbound helper call.
    options.data.isUnbound = true;
    helper = helpers[arguments[0]] || helpers.helperMissing;
    out = helper.apply(ctx, slice.call(arguments, 1));
    delete options.data.isUnbound;
    return out;
  }

  context = (fn.contexts && fn.contexts.length) ? fn.contexts[0] : ctx;
  return handlebarsGet(context, property, fn);
}

export default unboundHelper;
