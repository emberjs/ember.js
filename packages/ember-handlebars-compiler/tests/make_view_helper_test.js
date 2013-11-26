module("Ember.Handlebars.makeViewHelper");

test("makes helpful assertion when called with invalid arguments", function(){
  var viewClass = {toString: function(){ return 'Some Random Class';}};

  var helper = Ember.Handlebars.makeViewHelper(viewClass);

  expectAssertion(function(){
    helper({foo: 'bar'}, this);
  }, "You can only pass attributes (such as name=value) not bare values to a helper for a View found in 'Some Random Class'");
});
