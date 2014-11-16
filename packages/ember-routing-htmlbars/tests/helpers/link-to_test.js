import "ember-routing-htmlbars";
import run from "ember-metal/run_loop";
import EmberHandlebars from "ember-handlebars";
import EmberView from "ember-views/views/view";
import htmlbarsCompile from "ember-htmlbars/system/compile";
import { set } from "ember-metal/property_set";
import Controller from "ember-runtime/controllers/controller";

var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

var view;

var appendView = function(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
};

QUnit.module("Handlebars {{link-to}} helper", {
  teardown: function() {
    run(function() {
      if (view) { view.destroy(); }
    });
  }
});


test("should be able to be inserted in DOM when the router is not present", function() {
  var template = "{{#link-to 'index'}}Go to Index{{/link-to}}";
  view = EmberView.create({
    template: compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'Go to Index');
});

test("should be able to be inserted in DOM when the router is not present", function() {
  var template = "{{#link-to 'index'}}Go to Index{{/link-to}}";
  view = EmberView.create({
    template: compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'Go to Index');
});

test("re-renders when title changes", function() {
  var template = "{{link-to title routeName}}";
  view = EmberView.create({
    controller: {
      title: 'foo',
      routeName: 'index'
    },
    template: compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'foo');

  run(function() {
    set(view, 'controller.title', 'bar');
  });

  equal(view.$().text(), 'bar');
});

test("can read bound title", function() {
  var template = "{{link-to title routeName}}";
  view = EmberView.create({
    controller: {
      title: 'foo',
      routeName: 'index'
    },
    template: compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'foo');
});

test("escapes title in non-block form", function() {
  view = EmberView.create({
    title: "<b>blah</b>",

    template: compile("{{link-to view.title}}")
  });

  appendView(view);

  equal(view.$('b').length, 0, 'no <b> were found');
});

test("does not escape title in non-block form when `unescaped` is true", function() {
  view = EmberView.create({
    title: "<b>blah</b>",

    template: compile("{{link-to view.title unescaped=true}}")
  });

  appendView(view);

  equal(view.$('b').length, 1, '<b> was found');
});

test("unwraps controllers", function() {
  var template = "{{#link-to 'index' view.otherController}}Text{{/link-to}}";

  view = EmberView.create({
    otherController: Controller.create({
      model: 'foo'
    }),

    template: compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'Text');
});
