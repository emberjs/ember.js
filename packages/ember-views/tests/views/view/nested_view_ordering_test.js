import Registry from "container/registry";
import run from "ember-metal/run_loop";

import EmberView from "ember-views/views/view";
import compile from "ember-template-compiler/system/compile";

var registry, container, view;

QUnit.module("EmberView - Nested View Ordering", {
  setup: function() {
    registry = new Registry();
    container = registry.container();
  },
  teardown: function() {
    run(function() {
      if (view) { view.destroy(); }
      container.destroy();
    });
    registry = container = view = null;
  }
});

QUnit.test("should call didInsertElement on child views before parent", function() {
  var insertedLast;

  view = EmberView.create({
    didInsertElement: function() {
      insertedLast = "outer";
    },
    container: container,
    template: compile("{{view \"inner\"}}")
  });

  registry.register("view:inner", EmberView.extend({
    didInsertElement: function() {
      insertedLast = "inner";
    }
  }));

  run(function() {
    view.append();
  });

  equal(insertedLast, "outer", "didInsertElement called on outer view after inner view");
});
