import CoreObject from '@ember/object/core';
import EventedMixin from '@ember/object/evented';
import {
  moduleFor,
  AbstractTestCase,
  expectDeprecation,
  testUnless,
} from 'internal-test-helpers';
import { DEPRECATIONS } from '../../-internals/deprecations';

moduleFor(
  'Ember.Evented',
  class extends AbstractTestCase {
    [`${testUnless(
      DEPRECATIONS.DEPRECATE_EVENTED.isRemoved
    )} @test works properly on proxy-ish objects`](assert) {
      let eventedProxyObj;
      expectDeprecation(() => {
        eventedProxyObj = class extends CoreObject.extend(EventedMixin) {
          unknownProperty() {
            return true;
          }
        }.create();
      }, /Evented is deprecated/, DEPRECATIONS.DEPRECATE_EVENTED.isEnabled);

      let noop = function () {};

      expectDeprecation(() => {
        eventedProxyObj.on('foo', noop);
      }, /Evented#on` is deprecated/, DEPRECATIONS.DEPRECATE_EVENTED.isEnabled);

      expectDeprecation(() => {
        eventedProxyObj.off('foo', noop);
      }, /Evented#off` is deprecated/, DEPRECATIONS.DEPRECATE_EVENTED.isEnabled);

      assert.ok(true, 'An assertion was triggered');
    }
  }
);
