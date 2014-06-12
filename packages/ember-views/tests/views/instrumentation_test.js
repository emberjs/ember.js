import {
  subscribe,
  reset as instrumentationReset
} from "ember-metal/instrumentation";
import run from "ember-metal/run_loop";
import { guidFor } from "ember-metal/utils";
import { computed } from "ember-metal/computed";
import EmberView from "ember-views/views/view";

var view, beforeCalls, afterCalls;

function confirmPayload(payload, view) {
  var objectId = guidFor(view);

  equal(payload.object, view.toString(), 'payload object equals view.toString()');
  equal(payload.containerKey, view._debugContainerKey, 'payload contains the containerKey');
  equal(payload.view, view, 'payload contains the view itself');
}

QUnit.module("EmberView#instrumentation", {
  setup: function () {
    beforeCalls = [];
    afterCalls  = [];

    subscribe("render", {
      before: function(name, timestamp, payload) {
        beforeCalls.push(payload);
      },

      after: function(name, timestamp, payload) {
        afterCalls.push(payload);
      }
    });

    view = EmberView.create({
      _debugContainerKey: 'suchryzsd',
      instrumentDisplay: 'asdfasdfmewj',
    });
  },

  teardown: function() {
    if (view) {
      run(view, 'destroy');
    }

    instrumentationReset();
  }
});

test("generates the proper instrumentation details when called directly", function() {
  var payload = {};

  view.instrumentDetails(payload);

  confirmPayload(payload, view);
});

test("should add ember-view to views", function() {
  run(view, 'createElement');

  confirmPayload(beforeCalls[0], view);
});
