require("ember-views/system/render_buffer");

/**
@module ember
@submodule ember-handlebars
*/

var objectCreate = Ember.create;

var Handlebars = Ember.imports.Handlebars;
Ember.assert("Ember Handlebars requires Handlebars 1.0.beta.5 or greater", Handlebars && Handlebars.VERSION.match(/^1\.0\.beta\.[56789]$|^1\.0\.rc\.[123456789]+|^1\.0\.0\-rc\.[123456789]+/));

/**
  Prepares the Handlebars templating library for use inside Ember's view
  system.

  The Ember.Handlebars object is the standard Handlebars library, extended to use
  Ember's get() method instead of direct property access, which allows
  computed properties to be used inside templates.

  To create an Ember.Handlebars template, call Ember.Handlebars.compile().  This will
  return a function that can be used by Ember.View for rendering.

  @class Handlebars
  @namespace Ember
*/
Ember.Handlebars = objectCreate(Handlebars);

/**
@class helpers
@namespace Ember.Handlebars
*/
Ember.Handlebars.helpers = objectCreate(Handlebars.helpers);

/**
  Override the the opcode compiler and JavaScript compiler for Handlebars.

  @class Compiler
  @namespace Ember.Handlebars
  @private
  @constructor
*/
Ember.Handlebars.Compiler = function() {};

// Handlebars.Compiler doesn't exist in runtime-only
if (Handlebars.Compiler) {
  Ember.Handlebars.Compiler.prototype = objectCreate(Handlebars.Compiler.prototype);
}

Ember.Handlebars.Compiler.prototype.compiler = Ember.Handlebars.Compiler;

/**
  @class JavaScriptCompiler
  @namespace Ember.Handlebars
  @private
  @constructor
*/
Ember.Handlebars.JavaScriptCompiler = function() {};

// Handlebars.JavaScriptCompiler doesn't exist in runtime-only
if (Handlebars.JavaScriptCompiler) {
  Ember.Handlebars.JavaScriptCompiler.prototype = objectCreate(Handlebars.JavaScriptCompiler.prototype);
  Ember.Handlebars.JavaScriptCompiler.prototype.compiler = Ember.Handlebars.JavaScriptCompiler;
}


Ember.Handlebars.JavaScriptCompiler.prototype.namespace = "Ember.Handlebars";


Ember.Handlebars.JavaScriptCompiler.prototype.initializeBuffer = function() {
  return "''";
};

/**
  @private

  Override the default buffer for Ember Handlebars. By default, Handlebars creates
  an empty String at the beginning of each invocation and appends to it. Ember's
  Handlebars overrides this to append to a single shared buffer.

  @method appendToBuffer
  @param string {String}
*/
Ember.Handlebars.JavaScriptCompiler.prototype.appendToBuffer = function(string) {
  return "data.buffer.push("+string+");";
};

/**
  @private

  Rewrite simple mustaches from `{{foo}}` to `{{bind "foo"}}`. This means that all simple
  mustaches in Ember's Handlebars will also set up an observer to keep the DOM
  up to date when the underlying property changes.

  @method mustache
  @for Ember.Handlebars.Compiler
  @param mustache
*/
Ember.Handlebars.Compiler.prototype.mustache = function(mustache) {
  if (mustache.params.length || mustache.hash) {
    return Handlebars.Compiler.prototype.mustache.call(this, mustache);
  } else {
    var id = new Handlebars.AST.IdNode(['_triageMustache']);

    // Update the mustache node to include a hash value indicating whether the original node
    // was escaped. This will allow us to properly escape values when the underlying value
    // changes and we need to re-render the value.
    if(!mustache.escaped) {
      mustache.hash = mustache.hash || new Handlebars.AST.HashNode([]);
      mustache.hash.pairs.push(["unescaped", new Handlebars.AST.StringNode("true")]);
    }
    mustache = new Handlebars.AST.MustacheNode([id].concat([mustache.id]), mustache.hash, !mustache.escaped);
    return Handlebars.Compiler.prototype.mustache.call(this, mustache);
  }
};

/**
  Used for precompilation of Ember Handlebars templates. This will not be used during normal
  app execution.

  @method precompile
  @for Ember.Handlebars
  @static
  @param {String} string The template to precompile
*/
Ember.Handlebars.precompile = function(string) {
  var ast = Handlebars.parse(string);

  var options = {
    knownHelpers: {
      action: true,
      unbound: true,
      bindAttr: true,
      template: true,
      view: true,
      _triageMustache: true
    },
    data: true,
    stringParams: true
  };

  var environment = new Ember.Handlebars.Compiler().compile(ast, options);
  return new Ember.Handlebars.JavaScriptCompiler().compile(environment, options, undefined, true);
};

// We don't support this for Handlebars runtime-only
if (Handlebars.compile) {
  /**
    The entry point for Ember Handlebars. This replaces the default Handlebars.compile and turns on
    template-local data and String parameters.

    @method compile
    @for Ember.Handlebars
    @static
    @param {String} string The template to compile
    @return {Function}
  */
  Ember.Handlebars.compile = function(string) {
    var ast = Handlebars.parse(string);
    var options = { data: true, stringParams: true };
    var environment = new Ember.Handlebars.Compiler().compile(ast, options);
    var templateSpec = new Ember.Handlebars.JavaScriptCompiler().compile(environment, options, undefined, true);

    return Handlebars.template(templateSpec);
  };
}

/**
  @private

  If a path starts with a reserved keyword, returns the root
  that should be used.

  @method normalizePath
  @for Ember
  @param root {Object}
  @param path {String}
  @param data {Hash}
*/
var normalizePath = Ember.Handlebars.normalizePath = function(root, path, data) {
  var keywords = (data && data.keywords) || {},
      keyword, isKeyword;

  // Get the first segment of the path. For example, if the
  // path is "foo.bar.baz", returns "foo".
  keyword = path.split('.', 1)[0];

  // Test to see if the first path is a keyword that has been
  // passed along in the view's data hash. If so, we will treat
  // that object as the new root.
  if (keywords.hasOwnProperty(keyword)) {
    // Look up the value in the template's data hash.
    root = keywords[keyword];
    isKeyword = true;

    // Handle cases where the entire path is the reserved
    // word. In that case, return the object itself.
    if (path === keyword) {
      path = '';
    } else {
      // Strip the keyword from the path and look up
      // the remainder from the newly found root.
      path = path.substr(keyword.length+1);
    }
  }

  return { root: root, path: path, isKeyword: isKeyword };
};


/**
  Lookup both on root and on window. If the path starts with
  a keyword, the corresponding object will be looked up in the
  template's data hash and used to resolve the path.

  @method getPath
  @for Ember.Handlebars
  @param {Object} root The object to look up the property on
  @param {String} path The path to be lookedup
  @param {Object} options The template's option hash
*/
Ember.Handlebars.getPath = function(root, path, options) {
  var data = options && options.data,
      normalizedPath = normalizePath(root, path, data),
      value;

  // In cases where the path begins with a keyword, change the
  // root to the value represented by that keyword, and ensure
  // the path is relative to it.
  root = normalizedPath.root;
  path = normalizedPath.path;

  value = Ember.get(root, path);

  // If the path starts with a capital letter, look it up on Ember.lookup,
  // which defaults to the `window` object in browsers.
  if (value === undefined && root !== Ember.lookup && Ember.isGlobalPath(path)) {
    value = Ember.get(Ember.lookup, path);
  }
  return value;
};

/**
  @private

  Registers a helper in Handlebars that will be called if no property with the
  given name can be found on the current context object, and no helper with
  that name is registered.

  This throws an exception with a more helpful error message so the user can
  track down where the problem is happening.

  @method helperMissing
  @for Ember.Handlebars.helpers
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

