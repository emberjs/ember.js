import { run } from '@ember/runloop';
import { get } from '@ember/object';
import ObjectProxy from '@ember/object/proxy';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import EmberRSVP from '../../lib/ext/rsvp';
import { onerrorDefault } from '../../lib/ext/rsvp';
import * as RSVP from 'rsvp';
import {
  moduleFor,
  AbstractTestCase,
  expectDeprecation,
  ignoreDeprecation,
  testUnless,
} from 'internal-test-helpers';
import { DEPRECATIONS } from '@ember/-internals/deprecations';

let ObjectPromiseProxy, proxy;

moduleFor(
  'Ember.PromiseProxy - ObjectProxy',
  class extends AbstractTestCase {
    beforeEach() {
      ObjectPromiseProxy = ObjectProxy.extend(PromiseProxyMixin);
    }

    expectProxyDeprecations() {
      expectDeprecation(
        /`ObjectProxy` is deprecated/,
        DEPRECATIONS.DEPRECATE_OBJECT_PROXY.isEnabled
      );
      expectDeprecation(
        /`PromiseProxyMixin` is deprecated/,
        DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isEnabled
      );
    }

    afterEach() {
      RSVP.on('error', onerrorDefault);
      if (proxy) proxy.destroy();
      proxy = undefined;
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isRemoved)} @test present on ember namespace`](
      assert
    ) {
      assert.ok(PromiseProxyMixin, 'expected PromiseProxyMixin to exist');
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isRemoved)} @test no promise, invoking then should raise`](
      assert
    ) {
      this.expectProxyDeprecations();

      proxy = ObjectPromiseProxy.create();

      assert.throws(function () {
        proxy.then(
          function () {
            return this;
          },
          function () {
            return this;
          }
        );
      }, new RegExp("PromiseProxy's promise must be set"));
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isRemoved)} @test fulfillment`](
      assert
    ) {
      this.expectProxyDeprecations();

      let value = {
        firstName: 'stef',
        lastName: 'penner',
      };

      let deferred = RSVP.defer();

      proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      let didFulfillCount = 0;
      let didRejectCount = 0;

      proxy.then(
        () => didFulfillCount++,
        () => didRejectCount++
      );

      assert.equal(get(proxy, 'content'), undefined, 'expects the proxy to have no content');
      assert.equal(get(proxy, 'reason'), undefined, 'expects the proxy to have no reason');
      assert.equal(
        get(proxy, 'isPending'),
        true,
        'expects the proxy to indicate that it is loading'
      );
      assert.equal(
        get(proxy, 'isSettled'),
        false,
        'expects the proxy to indicate that it is not settled'
      );
      assert.equal(
        get(proxy, 'isRejected'),
        false,
        'expects the proxy to indicate that it is not rejected'
      );
      assert.equal(
        get(proxy, 'isFulfilled'),
        false,
        'expects the proxy to indicate that it is not fulfilled'
      );

      assert.equal(didFulfillCount, 0, 'should not yet have been fulfilled');
      assert.equal(didRejectCount, 0, 'should not yet have been rejected');

      run(deferred, 'resolve', value);

      assert.equal(didFulfillCount, 1, 'should have been fulfilled');
      assert.equal(didRejectCount, 0, 'should not have been rejected');

      assert.equal(get(proxy, 'content'), value, 'expects the proxy to have content');
      assert.equal(get(proxy, 'reason'), undefined, 'expects the proxy to still have no reason');
      assert.equal(
        get(proxy, 'isPending'),
        false,
        'expects the proxy to indicate that it is no longer loading'
      );
      assert.equal(
        get(proxy, 'isSettled'),
        true,
        'expects the proxy to indicate that it is settled'
      );
      assert.equal(
        get(proxy, 'isRejected'),
        false,
        'expects the proxy to indicate that it is not rejected'
      );
      assert.equal(
        get(proxy, 'isFulfilled'),
        true,
        'expects the proxy to indicate that it is fulfilled'
      );

      run(deferred, 'resolve', value);

      assert.equal(didFulfillCount, 1, 'should still have been only fulfilled once');
      assert.equal(didRejectCount, 0, 'should still not have been rejected');

      run(deferred, 'reject', value);

      assert.equal(didFulfillCount, 1, 'should still have been only fulfilled once');
      assert.equal(didRejectCount, 0, 'should still not have been rejected');

      assert.equal(
        get(proxy, 'content'),
        value,
        'expects the proxy to have still have same content'
      );
      assert.equal(get(proxy, 'reason'), undefined, 'expects the proxy still to have no reason');
      assert.equal(
        get(proxy, 'isPending'),
        false,
        'expects the proxy to indicate that it is no longer loading'
      );
      assert.equal(
        get(proxy, 'isSettled'),
        true,
        'expects the proxy to indicate that it is settled'
      );
      assert.equal(
        get(proxy, 'isRejected'),
        false,
        'expects the proxy to indicate that it is not rejected'
      );
      assert.equal(
        get(proxy, 'isFulfilled'),
        true,
        'expects the proxy to indicate that it is fulfilled'
      );

      // rest of the promise semantics are tested in directly in RSVP
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isRemoved)} @test rejection`](
      assert
    ) {
      this.expectProxyDeprecations();

      let reason = new Error('failure');
      let deferred = RSVP.defer();
      proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      let didFulfillCount = 0;
      let didRejectCount = 0;

      proxy.then(
        () => didFulfillCount++,
        () => didRejectCount++
      );

      assert.equal(get(proxy, 'content'), undefined, 'expects the proxy to have no content');
      assert.equal(get(proxy, 'reason'), undefined, 'expects the proxy to have no reason');
      assert.equal(
        get(proxy, 'isPending'),
        true,
        'expects the proxy to indicate that it is loading'
      );
      assert.equal(
        get(proxy, 'isSettled'),
        false,
        'expects the proxy to indicate that it is not settled'
      );
      assert.equal(
        get(proxy, 'isRejected'),
        false,
        'expects the proxy to indicate that it is not rejected'
      );
      assert.equal(
        get(proxy, 'isFulfilled'),
        false,
        'expects the proxy to indicate that it is not fulfilled'
      );

      assert.equal(didFulfillCount, 0, 'should not yet have been fulfilled');
      assert.equal(didRejectCount, 0, 'should not yet have been rejected');

      run(deferred, 'reject', reason);

      assert.equal(didFulfillCount, 0, 'should not yet have been fulfilled');
      assert.equal(didRejectCount, 1, 'should have been rejected');

      assert.equal(get(proxy, 'content'), undefined, 'expects the proxy to have no content');
      assert.equal(get(proxy, 'reason'), reason, 'expects the proxy to have a reason');
      assert.equal(
        get(proxy, 'isPending'),
        false,
        'expects the proxy to indicate that it is not longer loading'
      );
      assert.equal(
        get(proxy, 'isSettled'),
        true,
        'expects the proxy to indicate that it is settled'
      );
      assert.equal(
        get(proxy, 'isRejected'),
        true,
        'expects the proxy to indicate that it is  rejected'
      );
      assert.equal(
        get(proxy, 'isFulfilled'),
        false,
        'expects the proxy to indicate that it is not fulfilled'
      );

      run(deferred, 'reject', reason);

      assert.equal(didFulfillCount, 0, 'should stll not yet have been fulfilled');
      assert.equal(didRejectCount, 1, 'should still remain rejected');

      run(deferred, 'resolve', 1);

      assert.equal(didFulfillCount, 0, 'should stll not yet have been fulfilled');
      assert.equal(didRejectCount, 1, 'should still remain rejected');

      assert.equal(get(proxy, 'content'), undefined, 'expects the proxy to have no content');
      assert.equal(get(proxy, 'reason'), reason, 'expects the proxy to have a reason');
      assert.equal(
        get(proxy, 'isPending'),
        false,
        'expects the proxy to indicate that it is not longer loading'
      );
      assert.equal(
        get(proxy, 'isSettled'),
        true,
        'expects the proxy to indicate that it is settled'
      );
      assert.equal(
        get(proxy, 'isRejected'),
        true,
        'expects the proxy to indicate that it is  rejected'
      );
      assert.equal(
        get(proxy, 'isFulfilled'),
        false,
        'expects the proxy to indicate that it is not fulfilled'
      );
    }

    // https://github.com/emberjs/ember.js/issues/15694
    [`${testUnless(DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isRemoved)} @test rejection without specifying reason`](
      assert
    ) {
      this.expectProxyDeprecations();

      let deferred = RSVP.defer();
      proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      let didFulfillCount = 0;
      let didRejectCount = 0;

      proxy.then(
        () => didFulfillCount++,
        () => didRejectCount++
      );

      assert.equal(get(proxy, 'content'), undefined, 'expects the proxy to have no content');
      assert.equal(get(proxy, 'reason'), undefined, 'expects the proxy to have no reason');
      assert.equal(
        get(proxy, 'isPending'),
        true,
        'expects the proxy to indicate that it is loading'
      );
      assert.equal(
        get(proxy, 'isSettled'),
        false,
        'expects the proxy to indicate that it is not settled'
      );
      assert.equal(
        get(proxy, 'isRejected'),
        false,
        'expects the proxy to indicate that it is not rejected'
      );
      assert.equal(
        get(proxy, 'isFulfilled'),
        false,
        'expects the proxy to indicate that it is not fulfilled'
      );

      assert.equal(didFulfillCount, 0, 'should not yet have been fulfilled');
      assert.equal(didRejectCount, 0, 'should not yet have been rejected');

      run(deferred, 'reject');

      assert.equal(didFulfillCount, 0, 'should not yet have been fulfilled');
      assert.equal(didRejectCount, 1, 'should have been rejected');

      assert.equal(get(proxy, 'content'), undefined, 'expects the proxy to have no content');
      assert.equal(get(proxy, 'reason'), undefined, 'expects the proxy to have a reason');
      assert.equal(
        get(proxy, 'isPending'),
        false,
        'expects the proxy to indicate that it is not longer loading'
      );
      assert.equal(
        get(proxy, 'isSettled'),
        true,
        'expects the proxy to indicate that it is settled'
      );
      assert.equal(
        get(proxy, 'isRejected'),
        true,
        'expects the proxy to indicate that it is  rejected'
      );
      assert.equal(
        get(proxy, 'isFulfilled'),
        false,
        'expects the proxy to indicate that it is not fulfilled'
      );
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isRemoved)} @test unhandled rejects still propagate to RSVP.on('error', ...) `](
      assert
    ) {
      assert.expect(1);

      RSVP.on('error', onerror);
      RSVP.off('error', onerrorDefault);

      let expectedReason = new Error('failure');
      let deferred = RSVP.defer();

      // This test asserts an exact assertion count, so the proxy deprecations
      // are silenced here rather than expected; they are covered by the other
      // tests in this module.
      proxy = ignoreDeprecation(() =>
        ObjectPromiseProxy.create({
          promise: deferred.promise,
        })
      );

      proxy.get('promise');

      function onerror(reason) {
        assert.equal(reason, expectedReason, 'expected reason');
      }

      RSVP.on('error', onerror);
      RSVP.off('error', onerrorDefault);

      run(deferred, 'reject', expectedReason);

      RSVP.on('error', onerrorDefault);
      RSVP.off('error', onerror);

      run(deferred, 'reject', expectedReason);

      RSVP.on('error', onerrorDefault);
      RSVP.off('error', onerror);
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isRemoved)} @test should work with promise inheritance`](
      assert
    ) {
      this.expectProxyDeprecations();

      class PromiseSubclass extends RSVP.Promise {}

      proxy = ObjectPromiseProxy.create({
        promise: new PromiseSubclass(() => {}),
      });

      assert.ok(proxy.then() instanceof PromiseSubclass, 'promise proxy respected inheritance');
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isRemoved)} @test should reset isFulfilled and isRejected when promise is reset`](
      assert
    ) {
      this.expectProxyDeprecations();

      let deferred = EmberRSVP.defer();

      proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      assert.equal(
        get(proxy, 'isPending'),
        true,
        'expects the proxy to indicate that it is loading'
      );
      assert.equal(
        get(proxy, 'isSettled'),
        false,
        'expects the proxy to indicate that it is not settled'
      );
      assert.equal(
        get(proxy, 'isRejected'),
        false,
        'expects the proxy to indicate that it is not rejected'
      );
      assert.equal(
        get(proxy, 'isFulfilled'),
        false,
        'expects the proxy to indicate that it is not fulfilled'
      );

      run(deferred, 'resolve');

      assert.equal(
        get(proxy, 'isPending'),
        false,
        'expects the proxy to indicate that it is no longer loading'
      );
      assert.equal(
        get(proxy, 'isSettled'),
        true,
        'expects the proxy to indicate that it is settled'
      );
      assert.equal(
        get(proxy, 'isRejected'),
        false,
        'expects the proxy to indicate that it is not rejected'
      );
      assert.equal(
        get(proxy, 'isFulfilled'),
        true,
        'expects the proxy to indicate that it is fulfilled'
      );

      let anotherDeferred = EmberRSVP.defer();
      proxy.set('promise', anotherDeferred.promise);

      assert.equal(
        get(proxy, 'isPending'),
        true,
        'expects the proxy to indicate that it is loading'
      );
      assert.equal(
        get(proxy, 'isSettled'),
        false,
        'expects the proxy to indicate that it is not settled'
      );
      assert.equal(
        get(proxy, 'isRejected'),
        false,
        'expects the proxy to indicate that it is not rejected'
      );
      assert.equal(
        get(proxy, 'isFulfilled'),
        false,
        'expects the proxy to indicate that it is not fulfilled'
      );

      run(anotherDeferred, 'reject');

      assert.equal(
        get(proxy, 'isPending'),
        false,
        'expects the proxy to indicate that it is not longer loading'
      );
      assert.equal(
        get(proxy, 'isSettled'),
        true,
        'expects the proxy to indicate that it is settled'
      );
      assert.equal(
        get(proxy, 'isRejected'),
        true,
        'expects the proxy to indicate that it is  rejected'
      );
      assert.equal(
        get(proxy, 'isFulfilled'),
        false,
        'expects the proxy to indicate that it is not fulfilled'
      );
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isRemoved)} @test should have content when isFulfilled is set`](
      assert
    ) {
      this.expectProxyDeprecations();

      let deferred = EmberRSVP.defer();

      proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      proxy.addObserver('isFulfilled', () => assert.equal(get(proxy, 'content'), true));

      run(deferred, 'resolve', true);
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isRemoved)} @test should have reason when isRejected is set`](
      assert
    ) {
      this.expectProxyDeprecations();

      let error = new Error('Y U REJECT?!?');
      let deferred = EmberRSVP.defer();

      proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      proxy.addObserver('isRejected', () => assert.equal(get(proxy, 'reason'), error));

      try {
        run(deferred, 'reject', error);
      } catch (e) {
        assert.equal(e, error);
      }
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isRemoved)} @test should not error if promise is resolved after proxy has been destroyed`](
      assert
    ) {
      this.expectProxyDeprecations();

      let deferred = EmberRSVP.defer();

      proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      proxy.then(
        () => {},
        () => {}
      );

      run(proxy, 'destroy');

      run(deferred, 'resolve', true);

      assert.ok(
        true,
        'resolving the promise after the proxy has been destroyed does not raise an error'
      );
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isRemoved)} @test should not error if promise is rejected after proxy has been destroyed`](
      assert
    ) {
      this.expectProxyDeprecations();

      let deferred = EmberRSVP.defer();

      proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      proxy.then(
        () => {},
        () => {}
      );

      run(proxy, 'destroy');

      run(deferred, 'reject', 'some reason');

      assert.ok(
        true,
        'rejecting the promise after the proxy has been destroyed does not raise an error'
      );
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isRemoved)} @test promise chain is not broken if promised is resolved after proxy has been destroyed`](
      assert
    ) {
      this.expectProxyDeprecations();

      let deferred = EmberRSVP.defer();
      let expectedValue = {};
      let receivedValue;
      let didResolveCount = 0;

      proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      proxy.then(
        (value) => {
          receivedValue = value;
          didResolveCount++;
        },
        () => {}
      );

      run(proxy, 'destroy');

      run(deferred, 'resolve', expectedValue);

      assert.equal(didResolveCount, 1, 'callback called');
      assert.equal(
        receivedValue,
        expectedValue,
        'passed value is the value the promise was resolved with'
      );
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_PROMISE_PROXY_MIXIN.isRemoved)} @test promise chain is not broken if promised is rejected after proxy has been destroyed`](
      assert
    ) {
      this.expectProxyDeprecations();

      let deferred = EmberRSVP.defer();
      let expectedReason = 'some reason';
      let receivedReason;
      let didRejectCount = 0;

      proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      proxy.then(
        () => {},
        (reason) => {
          receivedReason = reason;
          didRejectCount++;
        }
      );

      run(proxy, 'destroy');

      run(deferred, 'reject', expectedReason);

      assert.equal(didRejectCount, 1, 'callback called');
      assert.equal(
        receivedReason,
        expectedReason,
        'passed reason is the reason the promise was rejected for'
      );
    }
  }
);
