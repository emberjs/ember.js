import EmberHandlebars from "ember-htmlbars/compat";

var precompile = EmberHandlebars.precompile;
var parse = EmberHandlebars.parse;
var template = 'Hello World';
var result;

QUnit.module("ember-htmlbars: Ember.Handlebars.precompile");

test("precompile creates an object when asObject isn't defined", function(){
  result = precompile(template);
  equal(typeof(result), "object");
});

test("precompile creates an object when asObject is true", function(){
  result = precompile(template, true);
  equal(typeof(result), "object");
});

test("precompile creates a string when asObject is false", function(){
  result = precompile(template, false);
  equal(typeof(result), "string");
});

if (!Ember.FEATURES.isEnabled('ember-htmlbars')) {

test("precompile creates an object when passed an AST", function(){
  var ast = parse(template);
  result = precompile(ast);
  equal(typeof(result), "object");
});

}
