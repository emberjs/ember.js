import EmberHandlebars from "ember-handlebars-compiler";

QUnit.module("Ember.Handlebars.makeViewHelper");

if (!Ember.FEATURES.isEnabled('ember-htmlbars')) {
  // unit tests exist in ember-htmlbars for makeViewHelper

test("makes helpful assertion when called with invalid arguments", function(){
  var viewClass = {toString: function(){ return 'Some Random Class';}};

  var helper = EmberHandlebars.makeViewHelper(viewClass);

  expectAssertion(function(){
    helper({foo: 'bar'}, this);
  }, "You can only pass attributes (such as name=value) not bare values to a helper for a View found in 'Some Random Class'");
});

}
