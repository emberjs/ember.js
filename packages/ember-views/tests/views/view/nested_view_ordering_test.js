import Container from "container";
import run from "ember-metal/run_loop";

import EmberView from "ember-views/views/view";
import EmberHandlebars from "ember-handlebars-compiler";

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

test("should call the function of the associated template", function() {
  var insertedLast;
  
  view = EmberView.create({
    didInsertElement: function(){
      insertedLast = "outer";
    },
    container: container,
    template: EmberHandlebars.compile("{{view \"inner\"}}")
  });

  container.register("view:inner", EmberView.extend({
    didInsertElement: function(){
      insertedLast = "inner";
    }
  }));

  run(function() {
    view.append();
  });

  equal(insertedLast, "inner", "inner view was inserted after outer view");
});
