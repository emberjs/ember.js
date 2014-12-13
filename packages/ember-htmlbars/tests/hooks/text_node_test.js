import EmberView from "ember-views/views/view";
import run from "ember-metal/run_loop";
import EmberObject from "ember-runtime/system/object";
import compile from "ember-htmlbars/system/compile";
import { equalInnerHTML } from "htmlbars-test-helpers";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var view;

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  QUnit.module("ember-htmlbars: hooks/text_node_test", {
    teardown: function(){
      runDestroy(view);
    }
  });

  test("property is output", function() {
    view = EmberView.create({
      context: {name: 'erik'},
      template: compile("ohai {{name}}")
    });
    runAppend(view);

    equalInnerHTML(view.element, 'ohai erik', "property is output");
  });

  test("path is output", function() {
    view = EmberView.create({
      context: {name: {firstName: 'erik'}},
      template: compile("ohai {{name.firstName}}")
    });
    runAppend(view);

    equalInnerHTML(view.element, 'ohai erik', "path is output");
  });

  test("changed property updates", function() {
    var context = EmberObject.create({name: 'erik'});
    view = EmberView.create({
      context: context,
      template: compile("ohai {{name}}")
    });
    runAppend(view);

    equalInnerHTML(view.element, 'ohai erik', "precond - original property is output");

    run(context, context.set, 'name', 'mmun');

    equalInnerHTML(view.element, 'ohai mmun', "new property is output");
  });
}
