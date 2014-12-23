import EmberView from "ember-views/views/view";
import run from "ember-metal/run_loop";
import compile from "ember-template-compiler/system/compile";
import { equalInnerHTML } from "htmlbars-test-helpers";

var view;

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

if (Ember.FEATURES.isEnabled('ember-htmlbars-attribute-syntax')) {

QUnit.module("ember-htmlbars: nonmatching reflection", {
  teardown: function(){
    if (view) {
      run(view, view.destroy);
    }
  }
});

test("maxlength sets the property and attribute", function() {
  view = EmberView.create({
    context: {length: 5},
    template: compile("<input maxlength={{length}}>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<input maxlength="5">', "attribute is output");
  equal(view.element.firstChild.maxLength, 5);

  Ember.run(view, view.set, 'context.length', 1);
  equalInnerHTML(view.element, '<input maxlength="1">', "attribute is modified by property setting");
  equal(view.element.firstChild.maxLength, 1);
});

test("quoted maxlength sets the property and attribute", function() {
  view = EmberView.create({
    context: {length: 5},
    template: compile("<input maxlength='{{length}}'>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<input maxlength="5">', "attribute is output");
  equal(view.element.firstChild.maxLength, '5');

  Ember.run(view, view.set, 'context.length', null);
  equalInnerHTML(view.element, '<input maxlength="0">', "attribute is output");
  equal(view.element.firstChild.maxLength, 0);
});

}
