import CoreObject from '@ember/object/core';
import EmberObject from '@ember/object';
import EventedMixin from '@ember/object/evented';
import Component from '@ember/component';
import Route from '@ember/routing/route';
import EmberRouter from '@ember/routing/router';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';
import { DEPRECATIONS } from '../../-internals/deprecations';

moduleFor(
  'Ember.Evented',
  class extends AbstractTestCase {
    ['@test Evented.detect returns true for framework classes that provide the Evented methods'](
      assert
    ) {
      assert.true(EventedMixin.detect(Component.prototype), 'Component');
      assert.true(EventedMixin.detect(Route.prototype), 'Route');
      assert.true(EventedMixin.detect(EmberRouter.prototype), 'EmberRouter');
      assert.true(EventedMixin.detect(class extends Route {}.prototype), 'Route subclass');

      let route = Route.create();
      assert.true(EventedMixin.detect(route), 'Route instance');
      route.destroy();

      assert.false(EventedMixin.detect(EmberObject.prototype), 'EmberObject');
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_EVENTED.isRemoved
    )} @test works properly on proxy-ish objects`](assert) {
      let eventedProxyObj;
      eventedProxyObj = class extends CoreObject.extend(EventedMixin) {
        unknownProperty() {
          return true;
        }
      }.create();

      let noop = function () {};

      expectDeprecation(
        () => {
          eventedProxyObj.on('foo', noop);
        },
        /Evented#on` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      expectDeprecation(
        () => {
          eventedProxyObj.off('foo', noop);
        },
        /Evented#off` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      assert.ok(true, 'An assertion was triggered');
    }
  }
);
