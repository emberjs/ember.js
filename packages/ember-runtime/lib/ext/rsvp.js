/* globals RSVP:true */

import Ember from 'ember-metal/core';
import Logger from 'ember-metal/logger';
import run from "ember-metal/run_loop";

// this is technically incorrect (per @wycats)
// it should be `import * as RSVP from 'rsvp';` but
// Esprima does not support this syntax yet (and neither does
// es6-module-transpiler 0.4.0 - 0.6.2).
module RSVP from 'rsvp';

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

RSVP.onerrorDefault = function (e) {
  var error;

  if (e && e.errorThrown) {
    // jqXHR provides this
    error = e.errorThrown;
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
      Ember.assert(error, false);
    }
  }
};

RSVP.on('error', RSVP.onerrorDefault);

export default RSVP;
