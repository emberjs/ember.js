import Ember from "ember-metal/core"; // FEATURES
import run from "ember-metal/run_loop";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import EmberObject from "ember-runtime/system/object";
import Component from "ember-views/views/component";
import TextSupport from "ember-views/mixins/text_support";
import EventDispatcher from "ember-views/system/event_dispatcher";

var component, dispatcher;
var isEnabled = Ember.FEATURES.isEnabled;

if (isEnabled("ember-views-text-support-on-change")) {
  QUnit.module("Mixin: TextSupport", {
    setup: function() {
      dispatcher = EventDispatcher.create();
      dispatcher.setup();
    },

    teardown: function() {
      runDestroy(dispatcher);
      runDestroy(component);
    }
  });

  test("`change` event is sent to controller", function() {
    expect(1);

    var controller = EmberObject.extend({
      send: function(actionName) {
        equal(actionName, "changeFired", "component sent 'change' event");
      }
    });
    component = Component.createWithMixins(TextSupport, {
      "on-change": "changeFired",
      targetObject: controller.create({})
    });
    runAppend(component);

    run(function() {
      component.$().trigger({ type: "change" });
    });
  });

  test("`input` event is sent to controller", function() {
    expect(1);

    var controller = EmberObject.extend({
      send: function(actionName) {
        equal(actionName, "inputFired", "component sent 'input' event");
      }
    });
    component = Component.createWithMixins(TextSupport, {
      "on-input": "inputFired",
      targetObject: controller.create({})
    });
    runAppend(component);

    run(function() {
      component.$().trigger({ type: "input" });
    });
  });
}
