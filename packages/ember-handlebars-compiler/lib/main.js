/**
@module ember
@submodule ember-handlebars-compiler
*/

// Eliminate dependency on any Ember to simplify precompilation workflow
var objectCreate = Object.create || function(parent) {
  function F() {}
  F.prototype = parent;
  return new F();
};

var Handlebars = this.Handlebars || (Ember.imports && Ember.imports.Handlebars);
if(!Handlebars && typeof require === 'function') {
  Handlebars = require('handlebars');
}

Ember.assert("Ember Handlebars requires Handlebars version 1.0.0. Include a SCRIPT tag in the HTML HEAD linking to the Handlebars file before you link to Ember.", Handlebars)
Ember.assert("Ember Handlebars requires Handlebars version 1.0.0, COMPILER_REVISION expected: 4, got: " +  Handlebars.COMPILER_REVISION + " - Please note: Builds of master may have other COMPILER_REVISION values.", Handlebars.COMPILER_REVISION === 4);

/**
  Prepares the Handlebars templating library for use inside Ember's view
  system.

  The `Ember.Handlebars` object is the standard Handlebars library, extended to
  use Ember's `get()` method instead of direct property access, which allows
  computed properties to be used inside templates.

  To create an `Ember.Handlebars` template, call `Ember.Handlebars.compile()`.
  This will return a function that can be used by `Ember.View` for rendering.

  @class Handlebars
  @namespace Ember
*/
Ember.Handlebars = objectCreate(Handlebars);

function makeBindings(options) {
  var hash = options.hash,
      hashType = options.hashTypes;

  for (var prop in hash) {
    if (hashType[prop] === 'ID') {
      hash[prop + 'Binding'] = hash[prop];
      hashType[prop + 'Binding'] = 'STRING';
      delete hash[prop];
      delete hashType[prop];
    }
  }
}

/**
  Register a bound helper or custom view helper.

  ## Simple bound helper example

  ```javascript
  Ember.Handlebars.helper('capitalize', function(value) {
    return value.toUpperCase();
  });
  ```

  The above bound helper can be used inside of templates as follows:

  ```handlebars
  {{capitalize name}}
  ```

  In this case, when the `name` property of the template's context changes,
  the rendered value of the helper will update to reflect this change.

  For more examples of bound helpers, see documentation for
  `Ember.Handlebars.registerBoundHelper`.

  ## Custom view helper example

  Assuming a view subclass named `App.CalenderView` were defined, a helper
  for rendering instances of this view could be registered as follows:

  ```javascript
  Ember.Handlebars.helper('calendar', App.CalendarView):
  ```

  The above bound helper can be used inside of templates as follows:

  ```handlebars
  {{calendar}}
  ```

  Which is functionally equivalent to:

  ```handlebars
  {{view App.CalendarView}}
  ```

  Options in the helper will be passed to the view in exactly the same
  manner as with the `view` helper.

  @method helper
  @for Ember.Handlebars
  @param {String} name
  @param {Function|Ember.View} function or view class constructor
  @param {String} dependentKeys*
*/
Ember.Handlebars.helper = function(name, value) {
  if (Ember.Component.detect(value)) {
    Ember.assert("You tried to register a component named '" + name + "', but component names must include a '-'", name.match(/-/));

    var proto = value.proto();
    if (!proto.layoutName && !proto.templateName) {
      value.reopen({
        layoutName: 'components/' + name
      });
    }
  }

  if (Ember.View.detect(value)) {
    Ember.Handlebars.registerHelper(name, function(options) {
      Ember.assert("You can only pass attributes as parameters (not values) to a application-defined helper", arguments.length < 2);
      makeBindings(options);
      return Ember.Handlebars.helpers.view.call(this, value, options);
    });
  } else {
    Ember.Handlebars.registerBoundHelper.apply(null, arguments);
  }
}

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

  Override the default buffer for Ember Handlebars. By default, Handlebars
  creates an empty String at the beginning of each invocation and appends to
  it. Ember's Handlebars overrides this to append to a single shared buffer.

  @method appendToBuffer
  @param string {String}
*/
Ember.Handlebars.JavaScriptCompiler.prototype.appendToBuffer = function(string) {
  return "data.buffer.push("+string+");";
};

var prefix = "ember" + (+new Date()), incr = 1;

/**
  @private

  Rewrite simple mustaches from `{{foo}}` to `{{bind "foo"}}`. This means that
  all simple mustaches in Ember's Handlebars will also set up an observer to
  keep the DOM up to date when the underlying property changes.

  @method mustache
  @for Ember.Handlebars.Compiler
  @param mustache
*/
Ember.Handlebars.Compiler.prototype.mustache = function(mustache) {
  if (mustache.isHelper && mustache.id.string === 'control') {
    mustache.hash = mustache.hash || new Handlebars.AST.HashNode([]);
    mustache.hash.pairs.push(["controlID", new Handlebars.AST.StringNode(prefix + incr++)]);
  } else if (mustache.params.length || mustache.hash) {
    // no changes required
  } else {
    var id = new Handlebars.AST.IdNode([{ part: '_triageMustache' }]);

    // Update the mustache node to include a hash value indicating whether the original node
    // was escaped. This will allow us to properly escape values when the underlying value
    // changes and we need to re-render the value.
    if(!mustache.escaped) {
      mustache.hash = mustache.hash || new Handlebars.AST.HashNode([]);
      mustache.hash.pairs.push(["unescaped", new Handlebars.AST.StringNode("true")]);
    }
    mustache = new Handlebars.AST.MustacheNode([id].concat([mustache.id]), mustache.hash, !mustache.escaped);
  }

  return Handlebars.Compiler.prototype.mustache.call(this, mustache);
};

/**
  Used for precompilation of Ember Handlebars templates. This will not be used
  during normal app execution.

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
    The entry point for Ember Handlebars. This replaces the default
    `Handlebars.compile` and turns on template-local data and String
    parameters.

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

    return Ember.Handlebars.template(templateSpec);
  };
}

