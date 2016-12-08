import { ENV } from 'ember-environment';
import { getDebugFunction, setDebugFunction } from 'ember-metal';
import { _warnIfUsingStrippedFeatureFlags } from '../index';

let oldWarn, oldRunInDebug, origEnvFeatures, origEnableOptional, features, knownFeatures;

function confirmWarns(expectedMsg) {
  let featuresWereStripped = true;

  setDebugFunction('warn', function(msg, test) {
    if (!test) {
      equal(msg, expectedMsg);
    }
  });

  setDebugFunction('runInDebug', function (func) {
    func();
  });

  // Should trigger our 1 warning
  _warnIfUsingStrippedFeatureFlags(features, knownFeatures, featuresWereStripped);

  // Shouldn't trigger any warnings now that we're "in canary"
  featuresWereStripped = false;
  _warnIfUsingStrippedFeatureFlags(features, knownFeatures, featuresWereStripped);
}

QUnit.module('ember-debug - _warnIfUsingStrippedFeatureFlags', {
  setup() {
    oldWarn            = getDebugFunction('warn');
    oldRunInDebug      = getDebugFunction('runInDebug');
    origEnvFeatures    = ENV.FEATURES;
    origEnableOptional = ENV.ENABLE_OPTIONAL_FEATURES;

    knownFeatures = {
      'fred': null,
      'barney': null,
      'wilma': null
    };
  },

  teardown() {
    setDebugFunction('warn', oldWarn);
    setDebugFunction('runInDebug', oldRunInDebug);
    ENV.FEATURES                 = origEnvFeatures;
    ENV.ENABLE_OPTIONAL_FEATURES = origEnableOptional;
  }
});

QUnit.test('Setting Ember.ENV.ENABLE_OPTIONAL_FEATURES truthy in non-canary, debug build causes a warning', function() {
  expect(1);

  ENV.ENABLE_OPTIONAL_FEATURES = true;
  features = {};

  confirmWarns('Ember.ENV.ENABLE_OPTIONAL_FEATURES is only available in canary builds.');
});

QUnit.test('Enabling a known FEATURE flag in non-canary, debug build causes a warning', function() {
  expect(1);

  ENV.ENABLE_OPTIONAL_FEATURES = false;
  features = {
    'fred': true,
    'barney': false,
    'wilma': null
  };

  confirmWarns('FEATURE["fred"] is set as enabled, but FEATURE flags are only available in canary builds.');
});

QUnit.test('Enabling an unknown FEATURE flag in non-canary debug build does not cause a warning', function() {
  expect(0);

  ENV.ENABLE_OPTIONAL_FEATURES = false;
  features = {
    'some-ember-data-feature-flag': true
  };

  confirmWarns('FEATURE["fred"] is set as enabled, but FEATURE flags are only available in canary builds.');
});

QUnit.test('`ENV.FEATURES` being undefined does not cause an error', function() {
  expect(0);

  ENV.ENABLE_OPTIONAL_FEATURES = false;
  features = undefined;

  confirmWarns();
});
