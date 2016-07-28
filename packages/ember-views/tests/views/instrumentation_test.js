import {
  subscribe,
  reset as instrumentationReset
} from 'ember-metal/instrumentation';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';

let view, beforeCalls, afterCalls;

function confirmPayload(payload, view) {
  equal(payload && payload.object, view.toString(), 'payload object equals view.toString()');
  equal(payload && payload.containerKey, view._debugContainerKey, 'payload contains the containerKey');
  equal(payload && payload.view, view, 'payload contains the view itself');
}

QUnit.module('EmberView#instrumentation', {
  setup() {
    beforeCalls = [];
    afterCalls  = [];

    subscribe('render', {
      before(name, timestamp, payload) {
        beforeCalls.push(payload);
      },

      after(name, timestamp, payload) {
        afterCalls.push(payload);
      }
    });

    view = EmberView.create({
      _debugContainerKey: 'suchryzsd',
      instrumentDisplay: 'asdfasdfmewj'
    });
  },

  teardown() {
    if (view) {
      run(view, 'destroy');
    }

    instrumentationReset();
  }
});

import { test } from 'internal-test-helpers/tests/skip-if-glimmer';
test('generates the proper instrumentation details when called directly', function() {
  let payload = {};

  view.instrumentDetails(payload);

  confirmPayload(payload, view);
});
