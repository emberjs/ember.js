import EmberView from "ember-views/views/view";
import run from "ember-metal/run_loop";
import compile from "ember-template-compiler/system/compile";
import { equalInnerHTML } from "htmlbars-test-helpers";

var view;

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

if (Ember.FEATURES.isEnabled('ember-htmlbars-attribute-syntax')) {
// jscs:disable validateIndentation

QUnit.module("ember-htmlbars: value attribute", {
  teardown: function() {
    if (view) {
      run(view, view.destroy);
    }
  }
});

test("property is output", function() {
  view = EmberView.create({
    context: { name: 'rick' },
    template: compile("<input value={{name}}>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<input>',
                 "attribute is not output");
  equal(view.element.firstChild.value, "rick",
        'property is set true');
});

test("string property is output", function() {
  view = EmberView.create({
    context: { name: 'rick' },
    template: compile("<input value='{{name}}'>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<input>',
                 "attribute is not output");
  equal(view.element.firstChild.value, "rick",
        'property is set true');
});

// jscs:enable validateIndentation
}
