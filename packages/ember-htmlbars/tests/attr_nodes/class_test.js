import EmberView from "ember-views/views/view";
import run from "ember-metal/run_loop";
import compile from "ember-htmlbars/system/compile";
import { equalInnerHTML } from "htmlbars-test-helpers";

var view;

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

var isInlineIfEnabled = false;
if (Ember.FEATURES.isEnabled('ember-htmlbars-inline-if-helper')) {
  isInlineIfEnabled = true;
}

if (Ember.FEATURES.isEnabled('ember-htmlbars-attribute-syntax')) {

QUnit.module("ember-htmlbars: class attribute", {
  teardown: function(){
    if (view) {
      run(view, view.destroy);
    }
  }
});

test("class property can contain multiple classes", function() {
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

test("class property is removed when updated with a null value", function() {
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

test("class attribute concats bound values", function() {
  view = EmberView.create({
    context: {size: 'large', color: 'blue'},
    template: compile("<div class='{{size}} {{color}} round'></div>")
  });
  appendView(view);

  ok(view.$('.large')[0], 'first class found');
  ok(view.$('.blue')[0], 'second class found');
  ok(view.$('.round')[0], 'third class found');
});

if (isInlineIfEnabled) {

test("class attribute accepts nested helpers, and updates", function() {
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

}

test("class attribute can accept multiple classes from a single value, and update", function() {
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

test("class attribute can grok concatted classes, and update", function() {
  view = EmberView.create({
    context: {
      size: 'large',
      prefix: 'pre-pre pre',
      postfix: 'post'
    },
    template: compile("<div class='btn-{{size}} {{prefix}}-{{postfix}}    whoop'></div>")
  });
  appendView(view);

  ok(view.$('.btn-large')[0], 'first class found');
  ok(view.$('.pre-pre')[0], 'second class found');
  ok(view.$('.pre-post')[0], 'third class found');
  ok(view.$('.whoop')[0], 'fourth class found');

  run(view, view.set, 'context.prefix', '');

  ok(view.$('.btn-large')[0], 'first class found');
  ok(view.$('.pre-pre').length === 0, 'second class not found');
  ok(view.$('.-post')[0], 'third class found');
  ok(view.$('.whoop')[0], 'fourth class found');
});

}
