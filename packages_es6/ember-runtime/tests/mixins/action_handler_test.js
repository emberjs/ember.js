test("passing a function for the actions hash triggers an assertion", function() {
  expect(1);

  var controller = Ember.Controller.extend({
    actions: function(){}
  });

  expectAssertion(function(){
    Ember.run(function(){
      controller.create();
    });
  });
});
