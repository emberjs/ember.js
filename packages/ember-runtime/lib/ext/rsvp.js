/* globals RSVP:true */

import Ember from 'ember-metal/core';
import { assert } from 'ember-metal/debug';
import Logger from 'ember-metal/logger';
import run from 'ember-metal/run_loop';
import * as RSVP from 'rsvp';

var testModuleName = 'ember-testing/test';
var Test;

var asyncStart = function() {
  if (Ember.Test && Ember.Test.adapter) {
    Ember.Test.adapter.asyncStart();
  }
};

var asyncEnd = function() {
  if (Ember.Test && Ember.Test.adapter) {
    Ember.Test.adapter.asyncEnd();
  }
};

RSVP.configure('async', function(callback, promise) {
  var async = !run.currentRunLoop;

  if (Ember.testing && async) { asyncStart(); }

  run.backburner.schedule('actions', function() {
    if (Ember.testing && async) { asyncEnd(); }
    callback(promise);
  });
});

export function onerrorDefault(reason) {
  var error;

  if (reason && reason.errorThrown) {
    // jqXHR provides this
    error = reason.errorThrown;
    if (typeof error === 'string') {
      error = new Error(error);
    }
    Object.defineProperty(error, '__reason_with_error_thrown__', {
      value: reason,
      enumerable: false
    });
  } else {
    error = reason;
  }

  if (error && error.name === "UnrecognizedURLError") {
    assert("The URL '" + error.message + "' did not match any routes in your application", false);
    return;
  }

  if (error && error.name !== 'TransitionAborted') {
    if (Ember.testing) {
      // ES6TODO: remove when possible
      if (!Test && Ember.__loader.registry[testModuleName]) {
        Test = requireModule(testModuleName)['default'];
      }

      if (Test && Test.adapter) {
        Test.adapter.exception(error);
        Logger.error(error.stack);
      } else {
        throw error;
      }
    } else if (Ember.onerror) {
      Ember.onerror(error);
    } else {
      Logger.error(error.stack);
    }
  }
}

export function after (cb) {
  Ember.run.schedule(Ember.run.queues[Ember.run.queues.length - 1], cb);
}

RSVP.on('error', onerrorDefault);
RSVP.configure('after', after);

export default RSVP;
