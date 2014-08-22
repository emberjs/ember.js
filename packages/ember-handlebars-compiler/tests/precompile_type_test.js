import EmberHandlebars from "ember-handlebars-compiler";
var precompile = EmberHandlebars.precompile;
var parse = EmberHandlebars.parse;
var template = 'Hello World';
var result;

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

test("precompile creates a function when passed an AST", function(){
  var ast = parse(template);
  result = precompile(ast);
  equal(typeof(result), "function");
});
