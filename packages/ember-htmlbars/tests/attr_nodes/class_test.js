import EmberView from "ember-views/views/view";
import run from "ember-metal/run_loop";
import compile from "ember-template-compiler/system/compile";
import { equalInnerHTML } from "htmlbars-test-helpers";

var view;

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

var isInlineIfEnabled = false;
if (Ember.FEATURES.isEnabled('ember-htmlbars-inline-if-helper')) {
  isInlineIfEnabled = true;
}

// jscs:disable validateIndentation
if (Ember.FEATURES.isEnabled('ember-htmlbars-attribute-syntax')) {

QUnit.module("ember-htmlbars: class attribute", {
  teardown() {
    if (view) {
      run(view, view.destroy);
    }
  }
});

QUnit.test("class renders before didInsertElement", function() {
  var matchingElement;
  view = EmberView.create({
    didInsertElement() {
      matchingElement = this.$('div.blue');
    },
    context: { color: 'blue' },
    template: compile("<div class={{color}}>Hi!</div>")
  });
  appendView(view);

  equal(view.element.firstChild.className, 'blue', "attribute is output");
  equal(matchingElement.length, 1, 'element is in the DOM when didInsertElement');
});

QUnit.test("class property can contain multiple classes", function() {
  view = EmberView.create({
    context: { classes: 'large blue' },
    template: compile("<div class={{classes}}></div>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<div class="large blue"></div>',
                 "attribute is output");
  ok(view.$('.large')[0], 'first class found');
  ok(view.$('.blue')[0], 'second class found');
});

QUnit.test("class property is removed when updated with a null value", function() {
  view = EmberView.create({
    context: { class: 'large' },
    template: compile("<div class={{class}}></div>")
  });
  appendView(view);

  equal(view.element.firstChild.className, 'large', "attribute is output");

  run(view, view.set, 'context.class', null);

  equal(view.element.firstChild.className, '', "attribute is removed");
});

QUnit.test("class attribute concats bound values", function() {
  view = EmberView.create({
    context: { size: 'large', color: 'blue' },
    template: compile("<div class='{{size}} {{color}} round'></div>")
  });
  appendView(view);

  ok(view.element.firstChild.className, 'large blue round', 'classes are set');
});

if (isInlineIfEnabled) {

QUnit.test("class attribute accepts nested helpers, and updates", function() {
  view = EmberView.create({
    context: {
      size: 'large',
      hasColor: true,
      hasShape: false,
      shape: 'round'
    },
    template: compile("<div class='{{if true size}} {{if hasColor 'blue'}} {{if hasShape shape 'no-shape'}}'></div>")
  });
  appendView(view);

  ok(view.element.firstChild.className, 'large blue no-shape', 'classes are set');

  run(view, view.set, 'context.hasColor', false);
  run(view, view.set, 'context.hasShape', true);

  ok(view.element.firstChild.className, 'large round', 'classes are updated');
});

}

QUnit.test("class attribute can accept multiple classes from a single value, and update", function() {
  view = EmberView.create({
    context: {
      size: 'large small'
    },
    template: compile("<div class='{{size}}'></div>")
  });
  appendView(view);

  ok(view.element.firstChild.className, 'large small', 'classes are set');

  run(view, view.set, 'context.size', 'medium');

  ok(view.element.firstChild.className, 'medium', 'classes are updated');
});

QUnit.test("class attribute can grok concatted classes, and update", function() {
  view = EmberView.create({
    context: {
      size: 'large',
      prefix: 'pre-pre pre',
      postfix: 'post'
    },
    template: compile("<div class='btn-{{size}} {{prefix}}-{{postfix}}    whoop'></div>")
  });
  appendView(view);

  ok(view.element.firstChild.className, 'btn-large pre-pre pre-post whoop', 'classes are set');

  run(view, view.set, 'context.prefix', '');

  ok(view.element.firstChild.className, 'btn-large -post whoop', 'classes are updated');
});

QUnit.test("class attribute stays in order", function() {
  view = EmberView.create({
    context: {
      showA: 'a',
      showB: 'b'
    },
    template: compile("<div class='r {{showB}} {{showA}} c'></div>")
  });
  appendView(view);

  run(view, view.set, 'context.showB', false);
  run(view, view.set, 'context.showB', true);

  ok(view.element.firstChild.className, 'r b a c', 'classes are in the right order');
});

}
// jscs:enable validateIndentation
