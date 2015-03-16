import Ember from 'ember-metal/core';

var isEnabled = Ember.FEATURES.isEnabled;
var origFeatures, origEnableAll, origEnableOptional;

QUnit.module("Ember.FEATURES.isEnabled", {
  setup() {
    origFeatures       = Ember.FEATURES;
    origEnableAll      = Ember.ENV.ENABLE_ALL_FEATURES;
    origEnableOptional = Ember.ENV.ENABLE_OPTIONAL_FEATURES;
  },

  teardown() {
    Ember.FEATURES                     = origFeatures;
    Ember.ENV.ENABLE_ALL_FEATURES      = origEnableAll;
    Ember.ENV.ENABLE_OPTIONAL_FEATURES = origEnableOptional;
  }
});

QUnit.test("ENV.ENABLE_ALL_FEATURES", function() {
  Ember.ENV.ENABLE_ALL_FEATURES = true;
  Ember.FEATURES['fred'] = false;
  Ember.FEATURES['wilma'] = null;

  equal(isEnabled('fred'), true, "overrides features set to false");
  equal(isEnabled('wilma'), true, "enables optional features");
  equal(isEnabled('betty'), true, "enables non-specified features");
});

QUnit.test("ENV.ENABLE_OPTIONAL_FEATURES", function() {
  Ember.ENV.ENABLE_OPTIONAL_FEATURES = true;
  Ember.FEATURES['fred'] = false;
  Ember.FEATURES['barney'] = true;
  Ember.FEATURES['wilma'] = null;

  equal(isEnabled('fred'), false, "returns flag value if false");
  equal(isEnabled('barney'), true, "returns flag value if true");
  equal(isEnabled('wilma'), true, "returns true if flag is not true|false|undefined");
  equal(isEnabled('betty'), undefined, "returns flag value if undefined");
});

QUnit.test("isEnabled without ENV options", function() {
  Ember.ENV.ENABLE_ALL_FEATURES = false;
  Ember.ENV.ENABLE_OPTIONAL_FEATURES = false;

  Ember.FEATURES['fred'] = false;
  Ember.FEATURES['barney'] = true;
  Ember.FEATURES['wilma'] = null;

  equal(isEnabled('fred'), false, "returns flag value if false");
  equal(isEnabled('barney'), true, "returns flag value if true");
  equal(isEnabled('wilma'), false, "returns false if flag is not set");
  equal(isEnabled('betty'), undefined, "returns flag value if undefined");
});
