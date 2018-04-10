import { get, run } from 'ember-metal';
import ObjectProxy from '../../lib/system/object_proxy';
import PromiseProxyMixin from '../../lib/mixins/promise_proxy';
import EmberRSVP from '../../lib/ext/rsvp';
import { onerrorDefault } from '../../lib/ext/rsvp';
import * as RSVP from 'rsvp';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let ObjectPromiseProxy;

moduleFor(
  'Ember.PromiseProxy - ObjectProxy',
  class extends AbstractTestCase {
    beforeEach() {
      ObjectPromiseProxy = ObjectProxy.extend(PromiseProxyMixin);
    }

    afterEach() {
      RSVP.on('error', onerrorDefault);
    }

    ['@test present on ember namespace'](assert) {
      assert.ok(PromiseProxyMixin, 'expected PromiseProxyMixin to exist');
    }

    ['@test no promise, invoking then should raise'](assert) {
      let proxy = ObjectPromiseProxy.create();

      assert.throws(function() {
        proxy.then(
          function() {
            return this;
          },
          function() {
            return this;
          }
        );
      }, new RegExp("PromiseProxy's promise must be set"));
    }

    ['@test fulfillment'](assert) {
      let value = {
        firstName: 'stef',
        lastName: 'penner',
      };

      let deferred = RSVP.defer();

      let proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      let didFulfillCount = 0;
      let didRejectCount = 0;

      proxy.then(() => didFulfillCount++, () => didRejectCount++);

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

    ['@test rejection'](assert) {
      let reason = new Error('failure');
      let deferred = RSVP.defer();
      let proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      let didFulfillCount = 0;
      let didRejectCount = 0;

      proxy.then(() => didFulfillCount++, () => didRejectCount++);

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
    ['@test rejection without specifying reason'](assert) {
      let deferred = RSVP.defer();
      let proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      let didFulfillCount = 0;
      let didRejectCount = 0;

      proxy.then(() => didFulfillCount++, () => didRejectCount++);

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

    ["@test unhandled rejects still propagate to RSVP.on('error', ...) "](assert) {
      assert.expect(1);

      RSVP.on('error', onerror);
      RSVP.off('error', onerrorDefault);

      let expectedReason = new Error('failure');
      let deferred = RSVP.defer();

      let proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

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

    ['@test should work with promise inheritance'](assert) {
      class PromiseSubclass extends RSVP.Promise {}

      let proxy = ObjectPromiseProxy.create({
        promise: new PromiseSubclass(() => {}),
      });

      assert.ok(proxy.then() instanceof PromiseSubclass, 'promise proxy respected inheritance');
    }

    ['@test should reset isFulfilled and isRejected when promise is reset'](assert) {
      let deferred = EmberRSVP.defer();

      let proxy = ObjectPromiseProxy.create({
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

    ['@test should have content when isFulfilled is set'](assert) {
      let deferred = EmberRSVP.defer();

      let proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      proxy.addObserver('isFulfilled', () => assert.equal(get(proxy, 'content'), true));

      run(deferred, 'resolve', true);
    }

    ['@test should have reason when isRejected is set'](assert) {
      let error = new Error('Y U REJECT?!?');
      let deferred = EmberRSVP.defer();

      let proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      proxy.addObserver('isRejected', () => assert.equal(get(proxy, 'reason'), error));

      try {
        run(deferred, 'reject', error);
      } catch (e) {
        assert.equal(e, error);
      }
    }

    ['@test should not error if promise is resolved after proxy has been destroyed'](assert) {
      let deferred = EmberRSVP.defer();

      let proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      proxy.then(() => {}, () => {});

      run(proxy, 'destroy');

      run(deferred, 'resolve', true);

      assert.ok(
        true,
        'resolving the promise after the proxy has been destroyed does not raise an error'
      );
    }

    ['@test should not error if promise is rejected after proxy has been destroyed'](assert) {
      let deferred = EmberRSVP.defer();

      let proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      proxy.then(() => {}, () => {});

      run(proxy, 'destroy');

      run(deferred, 'reject', 'some reason');

      assert.ok(
        true,
        'rejecting the promise after the proxy has been destroyed does not raise an error'
      );
    }

    ['@test promise chain is not broken if promised is resolved after proxy has been destroyed'](
      assert
    ) {
      let deferred = EmberRSVP.defer();
      let expectedValue = {};
      let receivedValue;
      let didResolveCount = 0;

      let proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      proxy.then(
        value => {
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

    ['@test promise chain is not broken if promised is rejected after proxy has been destroyed'](
      assert
    ) {
      let deferred = EmberRSVP.defer();
      let expectedReason = 'some reason';
      let receivedReason;
      let didRejectCount = 0;

      let proxy = ObjectPromiseProxy.create({
        promise: deferred.promise,
      });

      proxy.then(
        () => {},
        reason => {
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
