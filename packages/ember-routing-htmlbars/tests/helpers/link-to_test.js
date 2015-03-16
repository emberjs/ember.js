import "ember-routing-htmlbars";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import compile from "ember-template-compiler/system/compile";
import { set } from "ember-metal/property_set";
import Controller from "ember-runtime/controllers/controller";
import { Registry } from "ember-runtime/system/container";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import EmberObject from "ember-runtime/system/object";

var view;
var container;
var registry = new Registry();

// These tests don't rely on the routing service, but LinkView makes
// some assumptions that it will exist. This small stub service ensures
// that the LinkView can render without raising an exception.
//
// TODO: Add tests that test actual behavior. Currently, all behavior
// is tested integration-style in the `ember` package.
registry.register('service:-routing', EmberObject.extend({
  availableRoutes: function() { return ['index']; },
  hasRoute: function(name) { return name === 'index'; },
  isActiveForRoute: function() { return true; },
  generateURL: function() { return "/"; }
}));

QUnit.module("ember-routing-htmlbars: link-to helper", {
  setup: function() {
    container = registry.container();
  },

  teardown: function() {
    runDestroy(view);
  }
});


QUnit.test("should be able to be inserted in DOM when the router is not present", function() {
  var template = "{{#link-to 'index'}}Go to Index{{/link-to}}";
  view = EmberView.create({
    template: compile(template),
    container: container
  });

  runAppend(view);

  equal(view.$().text(), 'Go to Index');
});

QUnit.test("re-renders when title changes", function() {
  var template = "{{link-to title routeName}}";
  view = EmberView.create({
    controller: {
      title: 'foo',
      routeName: 'index'
    },
    template: compile(template),
    container: container
  });

  runAppend(view);

  equal(view.$().text(), 'foo');

  run(function() {
    set(view, 'controller.title', 'bar');
  });

  equal(view.$().text(), 'bar');
});

QUnit.test("can read bound title", function() {
  var template = "{{link-to title routeName}}";
  view = EmberView.create({
    controller: {
      title: 'foo',
      routeName: 'index'
    },
    template: compile(template),
    container: container
  });

  runAppend(view);

  equal(view.$().text(), 'foo');
});

QUnit.test("escaped inline form (double curlies) escapes link title", function() {
  view = EmberView.create({
    title: "<b>blah</b>",
    template: compile("{{link-to view.title}}"),
    container: container
  });

  runAppend(view);

  equal(view.$('b').length, 0, 'no <b> were found');
});

QUnit.test("unescaped inline form (triple curlies) does not escape link title", function() {
  view = EmberView.create({
    title: "<b>blah</b>",
    template: compile("{{{link-to view.title}}}"),
    container: container
  });

  runAppend(view);

  equal(view.$('b').length, 1, '<b> was found');
});

QUnit.test("unwraps controllers", function() {
  var template = "{{#link-to 'index' view.otherController}}Text{{/link-to}}";

  view = EmberView.create({
    otherController: Controller.create({
      model: 'foo'
    }),

    template: compile(template),
    container: container
  });

  expectDeprecation(function() {
    runAppend(view);
  }, /Providing `{{link-to}}` with a param that is wrapped in a controller is deprecated./);

  equal(view.$().text(), 'Text');
});
