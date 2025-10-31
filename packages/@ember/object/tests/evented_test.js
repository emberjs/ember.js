import CoreObject from '@ember/object/core';
import EventedMixin from '@ember/object/evented';
import { moduleFor, AbstractTestCase, expectDeprecation } from 'internal-test-helpers';

moduleFor(
  'Ember.Evented',
  class extends AbstractTestCase {
    ['@test works properly on proxy-ish objects'](assert) {
      let eventedProxyObj;
      expectDeprecation(() => {
        eventedProxyObj = class extends CoreObject.extend(EventedMixin) {
          unknownProperty() {
            return true;
          }
        }.create();
      }, /Evented mixin is deprecated/);

      let noop = function () {};

      expectDeprecation(() => {
        eventedProxyObj.on('foo', noop);
      }, /`on` is deprecated/);

      expectDeprecation(() => {
        eventedProxyObj.off('foo', noop);
      }, /`off` is deprecated/);

      assert.ok(true, 'An assertion was triggered');
    }
  }
);
