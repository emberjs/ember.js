import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import EmberObject from "ember-runtime/system/object";
import EmberView from "ember-views/views/view";

var view;

QUnit.module("EmberView evented helpers", {
  teardown: function() {
    run(function() {
      view.destroy();
    });
  }
});

test("fire should call method sharing event name if it exists on the view", function() {
  var eventFired = false;

  view = EmberView.create({
    fireMyEvent: function() {
      this.trigger('myEvent');
    },

    myEvent: function() {
      eventFired = true;
    }
  });

  run(function() {
    view.fireMyEvent();
  });

  equal(eventFired, true, "fired the view method sharing the event name");
});

test("fire does not require a view method with the same name", function() {
  var eventFired = false;

  view = EmberView.create({
    fireMyEvent: function() {
      this.trigger('myEvent');
    }
  });

  var listenObject = EmberObject.create({
    onMyEvent: function() {
      eventFired = true;
    }
  });

  view.on('myEvent', listenObject, 'onMyEvent');

  run(function() {
    view.fireMyEvent();
  });

  equal(eventFired, true, "fired the event without a view method sharing its name");

  run(function() {
    listenObject.destroy();
  });
});

