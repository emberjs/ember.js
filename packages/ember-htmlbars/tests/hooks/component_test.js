import isEnabled from "ember-metal/features";
import ComponentLookup from "ember-views/component_lookup";
import Registry from "container/registry";
import EmberView from "ember-views/views/view";
import compile from "ember-template-compiler/system/compile";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var view, registry, container;

if (isEnabled('ember-htmlbars-component-generation')) {
  QUnit.module("ember-htmlbars: component hook", {
    setup() {
      registry = new Registry();
      container = registry.container();

      registry.optionsForType('template', { instantiate: false });
      registry.register('component-lookup:main', ComponentLookup);
    },

    teardown() {
      runDestroy(view);
      runDestroy(container);
      registry = container = view = null;
    }
  });

  QUnit.test("component is looked up from the container", function() {
    registry.register('template:components/foo-bar', compile('yippie!'));

    view = EmberView.create({
      container: container,
      template: compile("<foo-bar />")
    });

    runAppend(view);

    equal(view.$().text(), 'yippie!', 'component was looked up and rendered');
  });

  QUnit.test("asserts if component is not found", function() {
    view = EmberView.create({
      container: container,
      template: compile("<foo-bar />")
    });

    expectAssertion(function() {
      runAppend(view);
    }, /Could not find component named "foo-bar" \(no component or template with that name was found\)/);
  });
}
