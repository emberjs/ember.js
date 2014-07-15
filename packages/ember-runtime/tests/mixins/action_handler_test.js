import run from "ember-metal/run_loop";
import Controller from "ember-runtime/controllers/controller";

QUnit.module('ActionHandlerMixin');

test("passing a function for the actions hash triggers an assertion", function() {
  expect(1);

  var controller = Controller.extend({
    actions: function(){}
  });

  expectAssertion(function(){
    run(function(){
      controller.create();
    });
  });
});

test("the action function is looked up with Ember.get", function() {
  expect(1);

  var controller = Controller.extend({
    actions: {
      unknownProperty: function() {
        ok(true, 'action triggered properly');
      }
    }
  }).create();

  controller.send('zomg-this-is-awesome');
});
