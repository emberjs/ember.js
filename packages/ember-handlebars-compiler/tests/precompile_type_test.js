import EmberHandlebars from "ember-handlebars-compiler";
var precompile = EmberHandlebars.precompile,
    parse = EmberHandlebars.parse,
    template = 'Hello World',
    result;

QUnit.module("Ember.Handlebars.precompileType");

test("precompile creates a function when asObject isn't defined", function(){
  result = precompile(template);
  equal(typeof(result), "function");
});

test("precompile creates a function when asObject is true", function(){
  result = precompile(template, true);
  equal(typeof(result), "function");
});

test("precompile creates a string when asObject is false", function(){
  result = precompile(template, false);
  equal(typeof(result), "string");
});

if (Ember.FEATURES.isEnabled("ember-handlebars-compiler-ast-to-precompile")) {
  test("precompile creates a function when passed an AST", function(){
    var ast = parse(template);
    result = precompile(ast);
    equal(typeof(result), "function");
  });
}


