import EmberView from "ember-views/views/view";
import run from "ember-metal/run_loop";
import { compile } from "htmlbars-compiler/compiler";
import { equalInnerHTML } from "htmlbars-test-helpers";

var view;

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {

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

test("attribute cannot set multiple classes with one prop", function() {
  view = EmberView.create({
    context: {classes: 'large blue'},
    template: compile("<div class='{{classes}}'></div>")
  });
  expectAssertion(function(){
    appendView(view);
  }, /Cannot specify a class with a space/);
});

test("attribute can use multiple props", function() {
  view = EmberView.create({
    context: {size: 'large', color: 'blue'},
    template: compile("<div class='{{size}} {{color}} round'></div>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<div class="large blue round"></div>',
                 "attribute is output");
  ok(view.$('.large')[0], 'first class found');
  ok(view.$('.blue')[0], 'second class found');
  ok(view.$('.round')[0], 'third class found');
});

}
