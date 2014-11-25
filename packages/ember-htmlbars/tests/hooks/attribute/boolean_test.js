import EmberView from "ember-views/views/view";
import run from "ember-metal/run_loop";
import { compile } from "htmlbars-compiler/compiler";
import { equalInnerHTML } from "htmlbars-test-helpers";

var view;

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {

QUnit.module("ember-htmlbars: boolean attribute", {
  teardown: function(){
    if (view) {
      run(view, view.destroy);
    }
  }
});

test("true property is output", function() {
  view = EmberView.create({
    context: {isDisabled: true},
    template: compile("<input disabled={{isDisabled}}>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<input disabled>',
                 "attribute is output");
  equal(view.element.firstChild.disabled, true,
        'boolean property is set true');
});

test("false property is removed", function() {
  view = EmberView.create({
    context: {isDisabled: false},
    template: compile("<input disabled={{isDisabled}}>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<input>',
                 "attribute is not output");
  equal(view.element.firstChild.disabled, false,
        'boolean property is set false');
});

test("string property is truthy", function() {
  view = EmberView.create({
    context: {isDisabled: "oh, no a string"},
    template: compile("<input disabled={{isDisabled}}>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<input disabled>',
                 "attribute is output");
  equal(view.element.firstChild.disabled, true,
        'boolean property is set false');
});

test("string liternal is truthy", function() {
  view = EmberView.create({
    context: {isDisabled: false},
    template: compile("<input disabled='{{isDisabled}}'>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<input disabled="false">',
                 "attribute is output");
  equal(view.element.firstChild.disabled, true,
        'boolean property is set true');
});

}
