import EmberView from "ember-views/views/view";
import EmberObject from "ember-runtime/system/object";
import run from "ember-metal/run_loop";
import EmberHandlebars from "ember-handlebars";
import htmlbarsCompile from "ember-htmlbars/system/compile";

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

var view;

var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

QUnit.module("ember-htmlbars: {{#bind}} helper", {
  teardown: function() {
    if (view) {
      run(view, view.destroy);
      view = null;
    }
  }
});

test("it should render the current value of a property on the context", function() {
  view = EmberView.create({
    template: compile('{{bind foo}}'),
    context: EmberObject.create({
      foo: "BORK"
    })
  });

  appendView(view);

  equal(view.$().text(), "BORK", "initial value is rendered");

  run(view, view.set, 'context.foo', 'MWEEER');

  equal(view.$().text(), "MWEEER", "value can be updated");
});

test("it should render the current value of a path on the context", function() {
  view = EmberView.create({
    template: compile('{{bind foo.bar}}'),
    context: EmberObject.create({
      foo: {
        bar: "BORK"
      }
    })
  });

  appendView(view);

  equal(view.$().text(), "BORK", "initial value is rendered");

  run(view, view.set, 'context.foo.bar', 'MWEEER');

  equal(view.$().text(), "MWEEER", "value can be updated");
});
