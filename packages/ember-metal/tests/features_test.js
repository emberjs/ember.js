import Ember from 'ember-metal/core';
import isEnabled, { FEATURES } from 'ember-metal/features';
import assign from 'ember-metal/assign';

var origFeatures, origEnableOptional;

QUnit.module('isEnabled', {
  setup() {
    origFeatures = assign({}, FEATURES);
    origEnableOptional = Ember.ENV.ENABLE_OPTIONAL_FEATURES;
  },

  teardown() {
    for (var feature in FEATURES) {
      delete FEATURES[feature];
    }
    assign(FEATURES, origFeatures);

    Ember.ENV.ENABLE_OPTIONAL_FEATURES = origEnableOptional;
  }
});

QUnit.test('ENV.ENABLE_OPTIONAL_FEATURES', function() {
  Ember.ENV.ENABLE_OPTIONAL_FEATURES = true;
  FEATURES['fred'] = false;
  FEATURES['barney'] = true;
  FEATURES['wilma'] = null;

  equal(isEnabled('fred'), false, 'returns flag value if false');
  equal(isEnabled('barney'), true, 'returns flag value if true');
  equal(isEnabled('wilma'), true, 'returns true if flag is not true|false|undefined');
  equal(isEnabled('betty'), undefined, 'returns flag value if undefined');
});

QUnit.test('isEnabled without ENV options', function() {
  Ember.ENV.ENABLE_OPTIONAL_FEATURES = false;

  FEATURES['fred'] = false;
  FEATURES['barney'] = true;
  FEATURES['wilma'] = null;

  equal(isEnabled('fred'), false, 'returns flag value if false');
  equal(isEnabled('barney'), true, 'returns flag value if true');
  equal(isEnabled('wilma'), false, 'returns false if flag is not set');
  equal(isEnabled('betty'), undefined, 'returns flag value if undefined');
});
