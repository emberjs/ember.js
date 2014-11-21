import Container from "container";
import run from "ember-metal/run_loop";

import EmberView from "ember-views/views/view";
import EmberHandlebars from "ember-handlebars-compiler";

var compile = EmberHandlebars.compile;

var container, view;

QUnit.module("EmberView - Nested View Ordering", {
  setup: function() {
    container = new Container();
  },
  teardown: function() {
    run(function() {
      if (view) { view.destroy(); }
    });
  }
});

test("should call didInsertElement on child views before parent", function() {
  var insertedLast;
  
  view = EmberView.create({
    didInsertElement: function(){
      insertedLast = "outer";
    },
    container: container,
    template: compile("{{view \"inner\"}}")
  });

  container.register("view:inner", EmberView.extend({
    didInsertElement: function(){
      insertedLast = "inner";
    }
  }));

  run(function() {
    view.append();
  });

  equal(insertedLast, "outer", "didInsertElement called on outer view after inner view");
});
