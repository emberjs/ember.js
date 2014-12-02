import EmberView from "ember-views/views/view";
import run from "ember-metal/run_loop";
import { compile } from "htmlbars-compiler/compiler";
import { equalInnerHTML } from "htmlbars-test-helpers";

var view;

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

if (Ember.FEATURES.isEnabled('ember-htmlbars-attribute-syntax')) {

QUnit.module("ember-htmlbars: class attribute", {
  teardown: function(){
    if (view) {
      run(view, view.destroy);
    }
  }
});

test("property can set multiple classes", function() {
  view = EmberView.create({
    context: {classes: 'large blue'},
    template: compile("<div class={{classes}}></div>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<div class="large blue"></div>',
                 "attribute is output");
  ok(view.$('.large')[0], 'first class found');
  ok(view.$('.blue')[0], 'second class found');
});

test("property can set remove class", function() {
  view = EmberView.create({
    context: {class: 'large'},
    template: compile("<div class={{class}}></div>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<div class="large"></div>',
                 "attribute is output");

  run(view, view.set, 'context.class', null);

  equalInnerHTML(view.element, '<div></div>',
                 "attribute is removed");
});

test("attribute can use multiple props", function() {
  view = EmberView.create({
    context: {size: 'large', color: 'blue'},
    template: compile("<div class='{{size}} {{color}} round'></div>")
  });
  appendView(view);

  ok(view.$('.large')[0], 'first class found');
  ok(view.$('.blue')[0], 'second class found');
  ok(view.$('.round')[0], 'third class found');
});

test("attribute can use multiple props with subxpression", function() {
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

  ok(view.$('.large')[0], 'first class found');
  ok(view.$('.blue')[0], 'second class found');
  ok(view.$('.no-shape')[0], 'third class found');

  run(view, view.set, 'context.hasColor', false);
  run(view, view.set, 'context.hasShape', true);

  ok(view.$('.large')[0], 'first class found after change');
  ok(view.$('.blue').length === 0, 'second class not found after change');
  ok(view.$('.round')[0], 'third class found after change');
});

test("multiple classed can yield from a single id", function() {
  view = EmberView.create({
    context: {
      size: 'large small'
    },
    template: compile("<div class='{{size}}'></div>")
  });
  appendView(view);

  ok(view.$('.large')[0], 'first class found');
  ok(view.$('.small')[0], 'second class found');

  run(view, view.set, 'context.size', 'medium');

  ok(view.$('.large').length === 0, 'old class not found');
  ok(view.$('.small').length === 0, 'old class not found');
  ok(view.$('.medium')[0], 'new class found');
});

}
