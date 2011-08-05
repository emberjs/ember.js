// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars */

/**
  @class

  Prepares the Handlebars templating library for use inside SproutCore's view
  system.

  The SC.Handlebars object is the standard Handlebars library, extended to use
  SproutCore's get() method instead of direct property access, which allows
  computed properties to be used inside templates.

  To use SC.Handlebars, call SC.Handlebars.compile().  This will return a
  function that you can call multiple times, with a context object as the first
  parameter:

      var template = SC.Handlebars.compile("my {{cool}} template");
      var result = template({
        cool: "awesome"
      });

      console.log(result); // prints "my awesome template"

  Note that you won't usually need to use SC.Handlebars yourself. Instead, use
  SC.View, which takes care of integration into the view layer for you.
*/

require("sproutcore-views/system/render_buffer");

/**
  @namespace

  SproutCore Handlebars is an extension to Handlebars that makes the built-in
  Handlebars helpers and {{mustaches}} binding-aware.
*/
SC.Handlebars = {};

/**
  Override the the opcode compiler and JavaScript compiler for Handlebars.
*/
SC.Handlebars.Compiler = function() {};
SC.Handlebars.Compiler.prototype = SC.create(Handlebars.Compiler.prototype);
SC.Handlebars.Compiler.prototype.compiler = SC.Handlebars.Compiler;

SC.Handlebars.JavaScriptCompiler = function() {};
SC.Handlebars.JavaScriptCompiler.prototype = SC.create(Handlebars.JavaScriptCompiler.prototype);
SC.Handlebars.JavaScriptCompiler.prototype.compiler = SC.Handlebars.JavaScriptCompiler;

/**
  Override the default property lookup semantics of Handlebars.

  By default, Handlebars uses object[property] to look up properties. SproutCore's Handlebars
  uses SC.get().

  @private
*/
SC.Handlebars.JavaScriptCompiler.prototype.nameLookup = function(parent, name, type) {
  if (type === 'context') {
    return "SC.get(" + parent + ", " + this.quotedString(name) + ");";
  } else {
    return Handlebars.JavaScriptCompiler.prototype.nameLookup.call(this, parent, name, type);
  }
};

SC.Handlebars.JavaScriptCompiler.prototype.initializeBuffer = function() {
  return "''";
};

/**
  Override the default buffer for SproutCore Handlebars. By default, Handlebars creates
  an empty String at the beginning of each invocation and appends to it. SproutCore's
  Handlebars overrides this to append to a single shared buffer.

  @private
*/
SC.Handlebars.JavaScriptCompiler.prototype.appendToBuffer = function(string) {
  return "data.buffer.push("+string+");";
};

/**
  Rewrite simple mustaches from {{foo}} to {{bind "foo"}}. This means that all simple
  mustaches in SproutCore's Handlebars will also set up an observer to keep the DOM
  up to date when the underlying property changes.

  @private
*/
SC.Handlebars.Compiler.prototype.mustache = function(mustache) {
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
  The entry point for SproutCore Handlebars. This replaces the default Handlebars.compile and turns on
  template-local data and String parameters.

  @param {String} string The template to compile
*/
SC.Handlebars.compile = function(string) {
  var ast = Handlebars.parse(string);
  var options = { data: true, stringParams: true };
  var environment = new SC.Handlebars.Compiler().compile(ast, options);
  var templateSpec = new SC.Handlebars.JavaScriptCompiler().compile(environment, options, undefined, true);

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
Handlebars.registerHelper('helperMissing', function(path, options) {
  var error, view = "";

  error = "%@ Handlebars error: Could not find property '%@' on object %@.";
  if (options.data){
    view = options.data.view;
  }
  throw new SC.Error(SC.String.fmt(error, [view, path, this]));
});

