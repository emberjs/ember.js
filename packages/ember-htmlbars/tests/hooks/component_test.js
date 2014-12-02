import ComponentLookup from "ember-views/component_lookup";
import Container from "container";
import EmberView from "ember-views/views/view";
import compile from "ember-htmlbars/system/compile";
import { appendView, destroyView } from "ember-views/tests/view_helpers";

var view, container;

function generateContainer() {
  var container = new Container();

  container.optionsForType('template', { instantiate: false });
  container.register('component-lookup:main', ComponentLookup);

  return container;
}

// this is working around a bug in defeatureify that prevents nested flags
// from being stripped
var componentGenerationEnabled = false;
if (Ember.FEATURES.isEnabled('ember-htmlbars-component-generation')) {
  componentGenerationEnabled = true;
}

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  if (componentGenerationEnabled) {
    QUnit.module("ember-htmlbars: component hook", {
      setup: function() {
        container = generateContainer();
      },

      teardown: function(){
        destroyView(view);
      }
    });

    test("component is looked up from the container", function() {
      container.register('template:components/foo-bar', compile('yippie!'));

      view = EmberView.create({
        container: container,
        template: compile("<foo-bar />")
      });

      appendView(view);

      equal(view.$().text(), 'yippie!', 'component was looked up and rendered');
    });

    test("asserts if component is not found", function() {
      view = EmberView.create({
        container: container,
        template: compile("<foo-bar />")
      });

      expectAssertion(function() {
        appendView(view);
      }, 'You specified `foo-bar` in your template, but a component for `foo-bar` could not be found.');
    });
  }
}
