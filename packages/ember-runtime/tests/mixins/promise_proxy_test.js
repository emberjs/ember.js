import create from 'ember-metal/platform/create';
import {get} from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import ObjectProxy from "ember-runtime/system/object_proxy";
import PromiseProxyMixin from "ember-runtime/mixins/promise_proxy";
import EmberRSVP from "ember-runtime/ext/rsvp";
import {
  onerrorDefault
} from "ember-runtime/ext/rsvp";
import * as RSVP from 'rsvp';

var ObjectPromiseProxy;

QUnit.test("present on ember namespace", function() {
  ok(PromiseProxyMixin, "expected PromiseProxyMixin to exist");
});

QUnit.module("Ember.PromiseProxy - ObjectProxy", {
  setup() {
    ObjectPromiseProxy = ObjectProxy.extend(PromiseProxyMixin);
  }
});

QUnit.test("no promise, invoking then should raise", function() {
  var proxy = ObjectPromiseProxy.create();

  throws(function() {
    proxy.then(function() { return this; }, function() { return this; });
  }, new RegExp("PromiseProxy's promise must be set"));
});

QUnit.test("fulfillment", function() {
  var value = {
    firstName: 'stef',
    lastName: 'penner'
  };

  var deferred = RSVP.defer();

  var proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  var didFulfillCount = 0;
  var didRejectCount  = 0;

  proxy.then(function() {
    didFulfillCount++;
  }, function() {
    didRejectCount++;
  });

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

QUnit.test("rejection", function() {
  var reason = new Error("failure");
  var deferred = RSVP.defer();
  var proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  var didFulfillCount = 0;
  var didRejectCount  = 0;

  proxy.then(function() {
    didFulfillCount++;
  }, function() {
    didRejectCount++;
  });

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

QUnit.test("unhandled rejects still propagate to RSVP.on('error', ...) ", function() {
  expect(1);

  RSVP.on('error', onerror);
  RSVP.off('error', onerrorDefault);

  var expectedReason = new Error("failure");
  var deferred = RSVP.defer();

  var proxy = ObjectPromiseProxy.create({
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

QUnit.test("should work with promise inheritance", function() {
  function PromiseSubclass() {
    RSVP.Promise.apply(this, arguments);
  }

  PromiseSubclass.prototype = create(RSVP.Promise.prototype);
  PromiseSubclass.prototype.constructor = PromiseSubclass;
  PromiseSubclass.cast = RSVP.Promise.cast;

  var proxy = ObjectPromiseProxy.create({
    promise: new PromiseSubclass(function() { })
  });

  ok(proxy.then() instanceof PromiseSubclass, 'promise proxy respected inheritance');
});

QUnit.test("should reset isFulfilled and isRejected when promise is reset", function() {
  var deferred = EmberRSVP.defer();

  var proxy = ObjectPromiseProxy.create({
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

  var anotherDeferred = EmberRSVP.defer();
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

QUnit.test("should have content when isFulfilled is set", function() {
  var deferred = EmberRSVP.defer();

  var proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  proxy.addObserver('isFulfilled', function() {
    equal(get(proxy, 'content'), true);
  });

  run(deferred, 'resolve', true);
});

QUnit.test("should have reason when isRejected is set", function() {
  var error = new Error('Y U REJECT?!?');
  var deferred = EmberRSVP.defer();

  var proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  proxy.addObserver('isRejected', function() {
    equal(get(proxy, 'reason'), error);
  });

  try {
    run(deferred, 'reject', error);
  } catch(e) {
    equal(e, error);
  }
});
