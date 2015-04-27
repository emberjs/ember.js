import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import EmberView from "ember-views/views/view";
import { compile } from "ember-template-compiler";
import Registry from "container/registry";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var registry, container, view;

QUnit.module("ember-htmlbars: makeViewHelper", {
  setup() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('helper', { instantiate: false });
  },
  teardown() {
    runDestroy(view);
  }
});

QUnit.skip("makes helpful assertion when called with invalid arguments", function() {
  var SomeRandom = EmberView.extend({
    template: compile("Some Random Class")
  });

  var helper = makeViewHelper(SomeRandom);
  registry.register('helper:some-random', helper);

  view = EmberView.create({
    template: compile("{{some-random 'sending-params-to-view-is-invalid'}}"),
    container
  });

  expectAssertion(function() {
    runAppend(view);
  }, "You can only pass attributes (such as name=value) not bare values to a helper for a View found in 'Some Random Class'");
});
