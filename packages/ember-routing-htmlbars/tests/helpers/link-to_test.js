import "ember-routing-htmlbars";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import compile from "ember-template-compiler/system/compile";
import { set } from "ember-metal/property_set";
import Controller from "ember-runtime/controllers/controller";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var view;

QUnit.module("Handlebars {{link-to}} helper", {
  teardown: function() {
    runDestroy(view);
  }
});


test("should be able to be inserted in DOM when the router is not present", function() {
  var template = "{{#link-to 'index'}}Go to Index{{/link-to}}";
  view = EmberView.create({
    template: compile(template)
  });

  runAppend(view);

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

  runAppend(view);

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

  runAppend(view);

  equal(view.$().text(), 'foo');
});

test("escapes title in non-block form", function() {
  view = EmberView.create({
    title: "<b>blah</b>",

    template: compile("{{link-to view.title}}")
  });

  runAppend(view);

  equal(view.$('b').length, 0, 'no <b> were found');
});

test("does not escape title in non-block form when `unescaped` is true", function() {
  view = EmberView.create({
    title: "<b>blah</b>",

    template: compile("{{link-to view.title unescaped=true}}")
  });

  runAppend(view);

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

  runAppend(view);

  equal(view.$().text(), 'Text');
});
