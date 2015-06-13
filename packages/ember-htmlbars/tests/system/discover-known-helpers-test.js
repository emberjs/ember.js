import Ember from "ember-metal/core";
import Registry from "container/registry";
import keys from "ember-metal/keys";
import Helper from "ember-htmlbars/helper";
import { runDestroy } from "ember-runtime/tests/utils";
import discoverKnownHelpers from "ember-htmlbars/system/discover-known-helpers";

var resolver, registry, container;

QUnit.module('ember-htmlbars: discover-known-helpers', {
  setup() {
    resolver = function() { };

    registry = new Registry({ resolver });
    container = registry.container();
  },

  teardown() {
    runDestroy(container);
    registry = container = null;
  }
});

QUnit.test('returns an empty hash when no helpers are known', function() {
  let result = discoverKnownHelpers(container);

  deepEqual(result, {}, 'no helpers were known');
});

if (Ember.FEATURES.isEnabled('ember-htmlbars-dashless-helpers')) {
  QUnit.test('includes helpers in the registry', function() {
    registry.register('helper:t', Helper);
    let result = discoverKnownHelpers(container);
    let helpers = keys(result);

    deepEqual(helpers, ['t'], 'helpers from the registry were known');
  });

  QUnit.test('includes resolved helpers', function() {
    resolver.knownForType = function() {
      return {
        'helper:f': true
      };
    };

    registry.register('helper:t', Helper);
    let result = discoverKnownHelpers(container);
    let helpers = keys(result);

    deepEqual(helpers, ['t', 'f'], 'helpers from the registry were known');
  });
} else {
  QUnit.test('returns empty object when disabled', function() {
    registry.register('helper:t', Helper);

    let result = discoverKnownHelpers(container);
    let helpers = keys(result);

    deepEqual(helpers, [], 'helpers from the registry were known');
  });
}
