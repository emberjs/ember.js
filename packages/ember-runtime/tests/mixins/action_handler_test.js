import run from "ember-metal/run_loop";
import Controller from "ember-runtime/controllers/controller";

QUnit.module("ActionHandler");

QUnit.test("passing a function for the actions hash triggers an assertion", function() {
  expect(1);

  var controller = Controller.extend({
    actions() {}
  });

  expectAssertion(function() {
    run(function() {
      controller.create();
    });
  });
});
