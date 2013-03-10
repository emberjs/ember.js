/*globals Handlebars */

require('ember-handlebars/ext');

/**
@module ember
@submodule ember-handlebars
*/

var handlebarsGet = Ember.Handlebars.get;

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
Ember.Handlebars.registerHelper('unbound', function(property, fn) {
  var options = arguments[arguments.length - 1], helper, context, out;

  if(arguments.length > 2) {
    // Unbound helper call.
    options.data.isUnbound = true;
    helper = Ember.Handlebars.helpers[arguments[0]] || Ember.Handlebars.helperMissing;
    out = helper.apply(this, Array.prototype.slice.call(arguments, 1));
    delete options.data.isUnbound;
    return out;
  }

  context = (fn.contexts && fn.contexts[0]) || this;
  return handlebarsGet(context, property, fn);
});
