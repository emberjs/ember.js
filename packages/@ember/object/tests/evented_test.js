import CoreObject from '@ember/object/core';
import EventedMixin from '@ember/object/evented';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Ember.Evented',
  class extends AbstractTestCase {
    ['@test works properly on proxy-ish objects'](assert) {
      let eventedProxyObj = CoreObject.extend(EventedMixin, {
        unknownProperty() {
          return true;
        },
      }).create();

      let noop = function () {};

      eventedProxyObj.on('foo', noop);
      eventedProxyObj.off('foo', noop);

      assert.ok(true, 'An assertion was triggered');
    }
  }
);
