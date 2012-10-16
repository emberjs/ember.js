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

  ``` handlebars
  <div>{{unbound somePropertyThatDoesntChange}}</div>
  ```

  If you call `unbound` with a block, it will unbind all the outputs in the
  block:

  ``` handlebars
  <tr>
    {{#unbound}}
      <td>{{firstName}}</td>
      <td>{{lastName}}</td>
      <td>{{age}}</td>
    {{/unbound}}
  </tr>
  ```

  @method unbound
  @for Ember.Handlebars.helpers
  @param {String} property
  @return {String} HTML string
*/
Ember.Handlebars.registerHelper('unbound', function() {
  var context;

  // Are we outputting a property?
  if (arguments.length === 2) {
    var property = arguments[0], fn = arguments[1];
    context = (fn.contexts && fn.contexts[0]) || this;
    return handlebarsGet(context, property, fn);
  }

  // Otherwise we are being called with a block:
  var options = arguments[0];
  context = (options.contexts && options.contexts[0]) || this;
  return options.fn(context);
});


/**
  `unboundIf` allows you to evaluate a conditional expression without
  creating a binding. *Important:* The conditional will not be re-evaluated if 
  the property changes. Use with caution.

  ``` handlebars
  <div>
    {{unboundIf somePropertyThatDoesntChange}}
      Hi! I won't go away even if the expression becomes false! 
    {{/unboundIf}}
  </div>
  ```
  @method unboundIf
  @for Ember.Handlebars.helpers
  @param {String} property to test
  @param {Hash} options
  @return {String} HTML string
*/
Ember.Handlebars.registerHelper('unboundIf', function(property, options) {
  Ember.assert("You must pass exactly one argument to the unboundIf helper", arguments.length === 2);
  Ember.assert("You must pass a block to the unboundIf helper", options.fn && options.fn !== Handlebars.VM.noop);

  var context = (options.contexts && options.contexts[0]) || this;
  var normalized = Ember.Handlebars.normalizePath(context, property, options.data);
  
  if (Ember.get(normalized.root,normalized.path,options))
    return options.fn(context,property);
  else
    return options.inverse(context,property);

});

/**
  `unboundUnless` allows you to evaluate the opposite of a conditional expression 
  without creating a binding. *Important:* The conditional will not be re-evaluated 
  if the property changes. Use with caution.

  ``` handlebars
  <div>
    {{unboundUnless somePropertyThatDoesntChange}}
      Hi! I won't go away even if the expression becomes true! 
    {{/unboundUnless}}
  </div>
  ```
  @method unboundUnless
  @for Ember.Handlebars.helpers
  @param {String} property to test
  @param {Hash} options
  @return {String} HTML string
*/
Ember.Handlebars.registerHelper('unboundUnless', function(property, options) {
  Ember.assert("You must pass exactly one argument to the unboundUnless helper", arguments.length === 2);
  Ember.assert("You must pass a block to the unboundUnless helper", options.fn && options.fn !== Handlebars.VM.noop);

  var context = (options.contexts && options.contexts[0]) || this;
  var normalized = Ember.Handlebars.normalizePath(context, property, options.data);
  
  if (Ember.get(normalized.root,normalized.path,options))
    return options.inverse(context,property);
  else
    return options.fn(context,property);
});

