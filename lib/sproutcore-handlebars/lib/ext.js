/**
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

require("handlebars");

SC.Handlebars = {};

SC.Handlebars.Compiler = function() {};
SC.Handlebars.Compiler.prototype = SC.beget(Handlebars.Compiler.prototype);
SC.Handlebars.Compiler.prototype.compiler = SC.Handlebars.Compiler;

SC.Handlebars.JavaScriptCompiler = function() {};
SC.Handlebars.JavaScriptCompiler.prototype = SC.beget(Handlebars.JavaScriptCompiler.prototype);
SC.Handlebars.JavaScriptCompiler.prototype.compiler = SC.Handlebars.JavaScriptCompiler;

SC.Handlebars.JavaScriptCompiler.prototype.nameLookup = function(parent, name, type) {
  if (type === 'context') {
    return "SC.get(" + parent + ", " + this.quotedString(name) + ");";
  } else {
    return Handlebars.JavaScriptCompiler.prototype.nameLookup.call(this, parent, name, type);
  }
};

SC.Handlebars.Compiler.prototype.mustache = function(mustache) {
  if (mustache.params.length || mustache.hash) {
    return Handlebars.Compiler.prototype.mustache.call(this, mustache);
  } else {
    var id = new Handlebars.AST.IdNode(['bind']);
    mustache = new Handlebars.AST.MustacheNode([id].concat([mustache.id]), mustache.hash, !mustache.escaped);
    return Handlebars.Compiler.prototype.mustache.call(this, mustache);
  }
};

SC.Handlebars.compile = function(string) {
  var ast = Handlebars.parse(string);
  var environment = new SC.Handlebars.Compiler().compile(ast, {data: true, stringParams: true});
  var ret = new SC.Handlebars.JavaScriptCompiler().compile(environment, {data: true, stringParams: true});
  ret.rawTemplate = string;
  return ret;
};

/**
  Registers a helper in Handlebars that will be called if no property with the
  given name can be found on the current context object, and no helper with
  that name is registered.

  This throws an exception with a more helpful error message so the user can
  track down where the problem is happening.
*/
Handlebars.registerHelper('helperMissing', function(path, options) {
  var error;

  error = "%@ Handlebars error: Could not find property '%@' on object %@.";
  throw error.fmt(options.data.view, path, this);
});

