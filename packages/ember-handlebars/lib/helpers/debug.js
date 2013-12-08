/*jshint debug:true*/

require('ember-handlebars/ext');

/**
@module ember
@submodule ember-handlebars
*/

var get = Ember.get, handlebarsGet = Ember.Handlebars.get, normalizePath = Ember.Handlebars.normalizePath;

/**
  `log` allows you to output the value of a variable in the current rendering
  context.

  ```handlebars
  {{log myVariable}}
  ```

  @method log
  @for Ember.Handlebars.helpers
  @param {String} property
*/
Ember.Handlebars.registerHelper('log', function(property, options) {
  var context = (options.contexts && options.contexts.length) ? options.contexts[0] : this,
      normalized = normalizePath(context, property, options.data),
      pathRoot = normalized.root,
      path = normalized.path,
      value = (path === 'this') ? pathRoot : handlebarsGet(pathRoot, path, options);
  Ember.Logger.log(value);
});

/**
  Execute the `debugger` statement in the current context.

  ```handlebars
  {{debugger}}
  ```

  Before invoking the `debugger` statement, there
  are a few helpful variables defined in the
  body of this helper that you can inspect while
  debugging that describe how and where this
  helper was invoked:

  - templateContext: this is most likely a controller
    from which this template looks up / displays properties
  - typeOfTemplateContext: a string that describes the
    type of object templateContext is, e.g.
    "controller:people"

  For example, if you're wondering why a value `{{foo}}`
  isn't rendering as expected within a template, you
  could place a `{{debugger}}` statement, and when
  the `debugger;` breakpoint is hit, you can inspect
  `templateContext`, determine if it's the object you
  expect, and/or evaluate expressions in the console
  to perform property lookups on the `templateContext`:

  ```
    > templateContext.get('foo') // -> "<value of foo>"
  ```

  @method debugger
  @for Ember.Handlebars.helpers
  @param {String} property
*/
Ember.Handlebars.registerHelper('debugger', function(options) {

  // These are helpful values you can inspect while debugging.
  var templateContext = this;
  var typeOfTemplateContext = this ? get(this, '_debugContainerKey') : 'none';

  debugger;
});


