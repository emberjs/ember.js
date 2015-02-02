/* globals RSVP:true */

import Ember from 'ember-metal/core';
import Logger from 'ember-metal/logger';
import run from "ember-metal/run_loop";
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

  run.backburner.schedule('actions', function(){
    if (Ember.testing && async) { asyncEnd(); }
    callback(promise);
  });
});

RSVP.Promise.prototype.fail = function(callback, label){
  Ember.deprecate('RSVP.Promise.fail has been renamed as RSVP.Promise.catch');
  return this['catch'](callback, label);
};

export function onerrorDefault(e) {
  var error;

  if (e && e.errorThrown) {
    // jqXHR provides this
    error = e.errorThrown;
    if (typeof error === 'string') {
      error = new Error(error);
    }
    error.__reason_with_error_thrown__ = e;
  } else {
    error = e;
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

RSVP.on('error', onerrorDefault);

export default RSVP;
