/*globals Handlebars */

require('ember-handlebars/ext');

/**
@module ember
@submodule ember-handlebars
*/

var getPath = Ember.Handlebars.getPath;

/**
  `unbound` allows you to output a property without binding. *Important:* The
  output will not be updated if the property changes. Use with caution.

  ``` handlebars
  <div>{{unbound somePropertyThatDoesntChange}}</div>
  ```

  @method unbound
  @for Ember.Handlebars.helpers
  @param {String} property
  @return {String} HTML string
*/
Ember.Handlebars.registerHelper('unbound', function(property, fn) {
  var context = (fn.contexts && fn.contexts[0]) || this;
  return getPath(context, property, fn);
});
