// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars */

require("ember-views/system/render_buffer");

/**
  @namespace
  @name Handlebars
  @private
*/

/**
  @namespace
  @name Handlebars.helpers
  @description Helpers for Handlebars templates
*/

/**
  @class

  Prepares the Handlebars templating library for use inside Ember's view
  system.

  The Ember.Handlebars object is the standard Handlebars library, extended to use
  Ember's get() method instead of direct property access, which allows
  computed properties to be used inside templates.

  To use Ember.Handlebars, call Ember.Handlebars.compile().  This will return a
  function that you can call multiple times, with a context object as the first
  parameter:

      var template = Ember.Handlebars.compile("my {{cool}} template");
      var result = template({
        cool: "awesome"
      });

      console.log(result); // prints "my awesome template"

  Note that you won't usually need to use Ember.Handlebars yourself. Instead, use
  Ember.View, which takes care of integration into the view layer for you.
*/
Ember.Handlebars = Ember.create(Handlebars);

Ember.Handlebars.helpers = Ember.create(Handlebars.helpers);

/**
  Override the the opcode compiler and JavaScript compiler for Handlebars.
*/
Ember.Handlebars.Compiler = function() {};
Ember.Handlebars.Compiler.prototype = Ember.create(Handlebars.Compiler.prototype);
Ember.Handlebars.Compiler.prototype.compiler = Ember.Handlebars.Compiler;

Ember.Handlebars.JavaScriptCompiler = function() {};
Ember.Handlebars.JavaScriptCompiler.prototype = Ember.create(Handlebars.JavaScriptCompiler.prototype);
Ember.Handlebars.JavaScriptCompiler.prototype.compiler = Ember.Handlebars.JavaScriptCompiler;
Ember.Handlebars.JavaScriptCompiler.prototype.namespace = "Ember.Handlebars";


Ember.Handlebars.JavaScriptCompiler.prototype.initializeBuffer = function() {
  return "''";
};

/**
  Override the default buffer for Ember Handlebars. By default, Handlebars creates
  an empty String at the beginning of each invocation and appends to it. Ember's
  Handlebars overrides this to append to a single shared buffer.

  @private
*/
Ember.Handlebars.JavaScriptCompiler.prototype.appendToBuffer = function(string) {
  return "data.buffer.push("+string+");";
};

/**
  Rewrite simple mustaches from {{foo}} to {{bind "foo"}}. This means that all simple
  mustaches in Ember's Handlebars will also set up an observer to keep the DOM
  up to date when the underlying property changes.

  @private
*/
Ember.Handlebars.Compiler.prototype.mustache = function(mustache) {
  if (mustache.params.length || mustache.hash) {
    return Handlebars.Compiler.prototype.mustache.call(this, mustache);
  } else {
    var id = new Handlebars.AST.IdNode(['bind']);

    // Update the mustache node to include a hash value indicating whether the original node
    // was escaped. This will allow us to properly escape values when the underlying value
    // changes and we need to re-render the value.
    if(mustache.escaped) {
      mustache.hash = mustache.hash || new Handlebars.AST.HashNode([]);
      mustache.hash.pairs.push(["escaped", new Handlebars.AST.StringNode("true")]);
    }
    mustache = new Handlebars.AST.MustacheNode([id].concat([mustache.id]), mustache.hash, !mustache.escaped);
    return Handlebars.Compiler.prototype.mustache.call(this, mustache);
  }
};

/**
  The entry point for Ember Handlebars. This replaces the default Handlebars.compile and turns on
  template-local data and String parameters.

  @param {String} string The template to compile
*/
Ember.Handlebars.compile = function(string) {
  var ast = Handlebars.parse(string);
  var options = { data: true, stringParams: true };
  var environment = new Ember.Handlebars.Compiler().compile(ast, options);
  var templateSpec = new Ember.Handlebars.JavaScriptCompiler().compile(environment, options, undefined, true);

  return Handlebars.template(templateSpec);
};

/**
  Registers a helper in Handlebars that will be called if no property with the
  given name can be found on the current context object, and no helper with
  that name is registered.

  This throws an exception with a more helpful error message so the user can
  track down where the problem is happening.

  @name Handlebars.helpers.helperMissing
  @param {String} path
  @param {Hash} options
*/
Ember.Handlebars.registerHelper('helperMissing', function(path, options) {
  var error, view = "";

  error = "%@ Handlebars error: Could not find property '%@' on object %@.";
  if (options.data){
    view = options.data.view;
  }
  throw new Ember.Error(Ember.String.fmt(error, [view, path, this]));
});

