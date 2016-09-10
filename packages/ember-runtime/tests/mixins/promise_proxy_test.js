import { get, run } from 'ember-metal';
import ObjectProxy from '../../system/object_proxy';
import PromiseProxyMixin from '../../mixins/promise_proxy';
import EmberRSVP from '../../ext/rsvp';
import {
  onerrorDefault
} from '../../ext/rsvp';
import * as RSVP from 'rsvp';

let ObjectPromiseProxy;

QUnit.test('present on ember namespace', function() {
  ok(PromiseProxyMixin, 'expected PromiseProxyMixin to exist');
});

QUnit.module('Ember.PromiseProxy - ObjectProxy', {
  setup() {
    ObjectPromiseProxy = ObjectProxy.extend(PromiseProxyMixin);
  },

  teardown() {
    RSVP.on('error', onerrorDefault);
  }
});

QUnit.test('no promise, invoking then should raise', function() {
  let proxy = ObjectPromiseProxy.create();

  throws(function() {
    proxy.then(function() { return this; }, function() { return this; });
  }, new RegExp('PromiseProxy\'s promise must be set'));
});

QUnit.test('fulfillment', function() {
  let value = {
    firstName: 'stef',
    lastName: 'penner'
  };

  let deferred = RSVP.defer();

  let proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  let didFulfillCount = 0;
  let didRejectCount  = 0;

  proxy.then(() => didFulfillCount++,
             () => didRejectCount++);

  equal(get(proxy, 'content'), undefined, 'expects the proxy to have no content');
  equal(get(proxy, 'reason'), undefined, 'expects the proxy to have no reason');
  equal(get(proxy, 'isPending'), true, 'expects the proxy to indicate that it is loading');
  equal(get(proxy, 'isSettled'), false, 'expects the proxy to indicate that it is not settled');
  equal(get(proxy, 'isRejected'), false, 'expects the proxy to indicate that it is not rejected');
  equal(get(proxy, 'isFulfilled'), false, 'expects the proxy to indicate that it is not fulfilled');

  equal(didFulfillCount, 0, 'should not yet have been fulfilled');
  equal(didRejectCount, 0, 'should not yet have been rejected');

  run(deferred, 'resolve', value);

  equal(didFulfillCount, 1, 'should have been fulfilled');
  equal(didRejectCount, 0, 'should not have been rejected');

  equal(get(proxy, 'content'), value, 'expects the proxy to have content');
  equal(get(proxy, 'reason'), undefined, 'expects the proxy to still have no reason');
  equal(get(proxy, 'isPending'), false, 'expects the proxy to indicate that it is no longer loading');
  equal(get(proxy, 'isSettled'), true, 'expects the proxy to indicate that it is settled');
  equal(get(proxy, 'isRejected'), false, 'expects the proxy to indicate that it is not rejected');
  equal(get(proxy, 'isFulfilled'), true, 'expects the proxy to indicate that it is fulfilled');

  run(deferred, 'resolve', value);

  equal(didFulfillCount, 1, 'should still have been only fulfilled once');
  equal(didRejectCount, 0, 'should still not have been rejected');

  run(deferred, 'reject', value);

  equal(didFulfillCount, 1, 'should still have been only fulfilled once');
  equal(didRejectCount, 0, 'should still not have been rejected');

  equal(get(proxy, 'content'), value, 'expects the proxy to have still have same content');
  equal(get(proxy, 'reason'), undefined, 'expects the proxy still to have no reason');
  equal(get(proxy, 'isPending'), false, 'expects the proxy to indicate that it is no longer loading');
  equal(get(proxy, 'isSettled'), true, 'expects the proxy to indicate that it is settled');
  equal(get(proxy, 'isRejected'), false, 'expects the proxy to indicate that it is not rejected');
  equal(get(proxy, 'isFulfilled'), true, 'expects the proxy to indicate that it is fulfilled');

  // rest of the promise semantics are tested in directly in RSVP
});

QUnit.test('rejection', function() {
  let reason = new Error('failure');
  let deferred = RSVP.defer();
  let proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  let didFulfillCount = 0;
  let didRejectCount  = 0;

  proxy.then(() => didFulfillCount++,
             () => didRejectCount++);

  equal(get(proxy, 'content'), undefined, 'expects the proxy to have no content');
  equal(get(proxy, 'reason'), undefined, 'expects the proxy to have no reason');
  equal(get(proxy, 'isPending'), true, 'expects the proxy to indicate that it is loading');
  equal(get(proxy, 'isSettled'), false, 'expects the proxy to indicate that it is not settled');
  equal(get(proxy, 'isRejected'), false, 'expects the proxy to indicate that it is not rejected');
  equal(get(proxy, 'isFulfilled'), false, 'expects the proxy to indicate that it is not fulfilled');

  equal(didFulfillCount, 0, 'should not yet have been fulfilled');
  equal(didRejectCount, 0, 'should not yet have been rejected');

  run(deferred, 'reject', reason);

  equal(didFulfillCount, 0, 'should not yet have been fulfilled');
  equal(didRejectCount, 1, 'should have been rejected');

  equal(get(proxy, 'content'), undefined, 'expects the proxy to have no content');
  equal(get(proxy, 'reason'), reason, 'expects the proxy to have a reason');
  equal(get(proxy, 'isPending'), false, 'expects the proxy to indicate that it is not longer loading');
  equal(get(proxy, 'isSettled'), true, 'expects the proxy to indicate that it is settled');
  equal(get(proxy, 'isRejected'), true, 'expects the proxy to indicate that it is  rejected');
  equal(get(proxy, 'isFulfilled'), false, 'expects the proxy to indicate that it is not fulfilled');

  run(deferred, 'reject', reason);

  equal(didFulfillCount, 0, 'should stll not yet have been fulfilled');
  equal(didRejectCount, 1, 'should still remain rejected');

  run(deferred, 'resolve', 1);

  equal(didFulfillCount, 0, 'should stll not yet have been fulfilled');
  equal(didRejectCount, 1, 'should still remain rejected');

  equal(get(proxy, 'content'), undefined, 'expects the proxy to have no content');
  equal(get(proxy, 'reason'), reason, 'expects the proxy to have a reason');
  equal(get(proxy, 'isPending'), false, 'expects the proxy to indicate that it is not longer loading');
  equal(get(proxy, 'isSettled'), true, 'expects the proxy to indicate that it is settled');
  equal(get(proxy, 'isRejected'), true, 'expects the proxy to indicate that it is  rejected');
  equal(get(proxy, 'isFulfilled'), false, 'expects the proxy to indicate that it is not fulfilled');
});

QUnit.test('unhandled rejects still propagate to RSVP.on(\'error\', ...) ', function() {
  expect(1);

  RSVP.on('error', onerror);
  RSVP.off('error', onerrorDefault);

  let expectedReason = new Error('failure');
  let deferred = RSVP.defer();

  let proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  proxy.get('promise');

  function onerror(reason) {
    equal(reason, expectedReason, 'expected reason');
  }

  RSVP.on('error', onerror);
  RSVP.off('error', onerrorDefault);

  run(deferred, 'reject', expectedReason);

  RSVP.on('error', onerrorDefault);
  RSVP.off('error', onerror);

  run(deferred, 'reject', expectedReason);

  RSVP.on('error', onerrorDefault);
  RSVP.off('error', onerror);
});

QUnit.test('should work with promise inheritance', function() {
  function PromiseSubclass() {
    RSVP.Promise.apply(this, arguments);
  }

  PromiseSubclass.prototype = Object.create(RSVP.Promise.prototype);
  PromiseSubclass.prototype.constructor = PromiseSubclass;
  PromiseSubclass.cast = RSVP.Promise.cast;

  let proxy = ObjectPromiseProxy.create({
    promise: new PromiseSubclass(() => { })
  });

  ok(proxy.then() instanceof PromiseSubclass, 'promise proxy respected inheritance');
});

QUnit.test('should reset isFulfilled and isRejected when promise is reset', function() {
  let deferred = EmberRSVP.defer();

  let proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  equal(get(proxy, 'isPending'), true, 'expects the proxy to indicate that it is loading');
  equal(get(proxy, 'isSettled'), false, 'expects the proxy to indicate that it is not settled');
  equal(get(proxy, 'isRejected'), false, 'expects the proxy to indicate that it is not rejected');
  equal(get(proxy, 'isFulfilled'), false, 'expects the proxy to indicate that it is not fulfilled');

  run(deferred, 'resolve');

  equal(get(proxy, 'isPending'), false, 'expects the proxy to indicate that it is no longer loading');
  equal(get(proxy, 'isSettled'), true, 'expects the proxy to indicate that it is settled');
  equal(get(proxy, 'isRejected'), false, 'expects the proxy to indicate that it is not rejected');
  equal(get(proxy, 'isFulfilled'), true, 'expects the proxy to indicate that it is fulfilled');

  let anotherDeferred = EmberRSVP.defer();
  proxy.set('promise', anotherDeferred.promise);

  equal(get(proxy, 'isPending'), true, 'expects the proxy to indicate that it is loading');
  equal(get(proxy, 'isSettled'), false, 'expects the proxy to indicate that it is not settled');
  equal(get(proxy, 'isRejected'), false, 'expects the proxy to indicate that it is not rejected');
  equal(get(proxy, 'isFulfilled'), false, 'expects the proxy to indicate that it is not fulfilled');

  run(anotherDeferred, 'reject');

  equal(get(proxy, 'isPending'), false, 'expects the proxy to indicate that it is not longer loading');
  equal(get(proxy, 'isSettled'), true, 'expects the proxy to indicate that it is settled');
  equal(get(proxy, 'isRejected'), true, 'expects the proxy to indicate that it is  rejected');
  equal(get(proxy, 'isFulfilled'), false, 'expects the proxy to indicate that it is not fulfilled');
});

QUnit.test('should have content when isFulfilled is set', function() {
  let deferred = EmberRSVP.defer();

  let proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  proxy.addObserver('isFulfilled', () => equal(get(proxy, 'content'), true));

  run(deferred, 'resolve', true);
});

QUnit.test('should have reason when isRejected is set', function() {
  let error = new Error('Y U REJECT?!?');
  let deferred = EmberRSVP.defer();

  let proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  proxy.addObserver('isRejected', () => equal(get(proxy, 'reason'), error));

  try {
    run(deferred, 'reject', error);
  } catch(e) {
    equal(e, error);
  }
});

QUnit.test('should not error if promise is resolved after proxy has been destroyed', function() {
  let deferred = EmberRSVP.defer();

  let proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  proxy.then(() => {}, () => {});

  run(proxy, 'destroy');

  run(deferred, 'resolve', true);

  ok(true, 'resolving the promise after the proxy has been destroyed does not raise an error');
});

QUnit.test('should not error if promise is rejected after proxy has been destroyed', function() {
  let deferred = EmberRSVP.defer();

  let proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  proxy.then(() => {}, () => {});

  run(proxy, 'destroy');

  run(deferred, 'reject', 'some reason');

  ok(true, 'rejecting the promise after the proxy has been destroyed does not raise an error');
});

QUnit.test('promise chain is not broken if promised is resolved after proxy has been destroyed', function() {
  let deferred = EmberRSVP.defer();
  let expectedValue = {};
  let receivedValue;
  let didResolveCount = 0;

  let proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  proxy.then((value) => {
    receivedValue = value;
    didResolveCount++;
  }, () => {});

  run(proxy, 'destroy');

  run(deferred, 'resolve', expectedValue);

  equal(didResolveCount, 1, 'callback called');
  equal(receivedValue, expectedValue, 'passed value is the value the promise was resolved with');
});

QUnit.test('promise chain is not broken if promised is rejected after proxy has been destroyed', function() {
  let deferred = EmberRSVP.defer();
  let expectedReason = 'some reason';
  let receivedReason;
  let didRejectCount = 0;

  let proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  proxy.then(
    () => {},
    (reason) => {
      receivedReason = reason;
      didRejectCount++;
    });

  run(proxy, 'destroy');

  run(deferred, 'reject', expectedReason);

  equal(didRejectCount, 1, 'callback called');
  equal(receivedReason, expectedReason, 'passed reason is the reason the promise was rejected for');
});
