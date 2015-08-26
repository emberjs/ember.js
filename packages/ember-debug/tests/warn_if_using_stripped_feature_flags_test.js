import Ember from 'ember-metal/core';
import { getDebugFunction, setDebugFunction } from 'ember-metal/debug';
import { _warnIfUsingStrippedFeatureFlags } from 'ember-debug';

var oldWarn, oldRunInDebug, origEnvFeatures, origEnableAll, origEnableOptional;

function confirmWarns(expectedMsg) {
  var featuresWereStripped = true;
  var FEATURES = Ember.ENV.FEATURES;

  setDebugFunction('warn', function(msg, test) {
    if (!test) {
      equal(msg, expectedMsg);
    }
  });

  setDebugFunction('runInDebug', function (func) {
    func();
  });

  // Should trigger our 1 warning
  _warnIfUsingStrippedFeatureFlags(FEATURES, featuresWereStripped);

  // Shouldn't trigger any warnings now that we're "in canary"
  featuresWereStripped = false;
  _warnIfUsingStrippedFeatureFlags(FEATURES, featuresWereStripped);
}

QUnit.module('ember-debug - _warnIfUsingStrippedFeatureFlags', {
  setup() {
    oldWarn            = getDebugFunction('warn');
    oldRunInDebug      = getDebugFunction('runInDebug');
    origEnvFeatures    = Ember.ENV.FEATURES;
    origEnableAll      = Ember.ENV.ENABLE_ALL_FEATURES;
    origEnableOptional = Ember.ENV.ENABLE_OPTIONAL_FEATURES;
  },

  teardown() {
    setDebugFunction('warn', oldWarn);
    setDebugFunction('runInDebug', oldRunInDebug);
    Ember.ENV.FEATURES                 = origEnvFeatures;
    Ember.ENV.ENABLE_ALL_FEATURES      = origEnableAll;
    Ember.ENV.ENABLE_OPTIONAL_FEATURES = origEnableOptional;
  }
});

QUnit.test('Setting Ember.ENV.ENABLE_ALL_FEATURES truthy in non-canary, debug build causes a warning', function() {
  expect(1);

  Ember.ENV.ENABLE_ALL_FEATURES = true;
  Ember.ENV.ENABLE_OPTIONAL_FEATURES = false;
  Ember.ENV.FEATURES = {};

  confirmWarns('Ember.ENV.ENABLE_ALL_FEATURES is only available in canary builds.');
});

QUnit.test('Setting Ember.ENV.ENABLE_OPTIONAL_FEATURES truthy in non-canary, debug build causes a warning', function() {
  expect(1);

  Ember.ENV.ENABLE_ALL_FEATURES = false;
  Ember.ENV.ENABLE_OPTIONAL_FEATURES = true;
  Ember.ENV.FEATURES = {};

  confirmWarns('Ember.ENV.ENABLE_OPTIONAL_FEATURES is only available in canary builds.');
});

QUnit.test('Enabling a FEATURES flag in non-canary, debug build causes a warning', function() {
  expect(1);

  Ember.ENV.ENABLE_ALL_FEATURES = false;
  Ember.ENV.ENABLE_OPTIONAL_FEATURES = false;
  Ember.ENV.FEATURES = {
    'fred': true,
    'barney': false,
    'wilma': null
  };

  confirmWarns('FEATURE["fred"] is set as enabled, but FEATURE flags are only available in canary builds.');
});
