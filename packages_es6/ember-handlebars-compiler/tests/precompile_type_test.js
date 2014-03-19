import EmberHandlebars from "ember-handlebars-compiler";
var precompile = EmberHandlebars.precompile,
    template = 'Hello World',
    result;

module("Ember.Handlebars.precompileType");

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
