var ObjectPromiseProxy;
var get = Ember.get;

test("present on ember namespace", function(){
  ok(Ember.PromiseProxyMixin, "expected Ember.PromiseProxyMixin to exist");
});

module("Ember.PromiseProxy - ObjectProxy", {
  setup: function() {
    ObjectPromiseProxy = Ember.ObjectProxy.extend(Ember.PromiseProxyMixin);
  }
});

test("no promise, invoking then should raise", function(){
  var value = {
    firstName: 'stef',
    lastName: 'penner'
  };

  var proxy = ObjectPromiseProxy.create();

  raises(function(){
    proxy.then(Ember.K, Ember.K);
  }, new RegExp("PromiseProxy's promise must be set"));
});

test("fulfillment", function(){
  var value = {
    firstName: 'stef',
    lastName: 'penner'
  };

  var deferred = Ember.RSVP.defer();

  var proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  var didFulfillCount = 0;
  var didRejectCount  = 0;

  proxy.then(function(){
    didFulfillCount++;
  }, function(){
    didRejectCount++;
  });

  equal(get(proxy, 'content'),     undefined, 'expects the proxy to have no content');
  equal(get(proxy, 'reason'),      undefined, 'expects the proxy to have no reason');
  equal(get(proxy, 'isPending'),   true,  'expects the proxy to indicate that it is loading');
  equal(get(proxy, 'isSettled'),   false, 'expects the proxy to indicate that it is not settled');
  equal(get(proxy, 'isRejected'),  false, 'expects the proxy to indicate that it is not rejected');
  equal(get(proxy, 'isFulfilled'), false, 'expects the proxy to indicate that it is not fulfilled');

  equal(didFulfillCount, 0, 'should not yet have been fulfilled');
  equal(didRejectCount, 0, 'should not yet have been rejected');

  Ember.run(deferred, 'resolve', value);

  equal(didFulfillCount, 1, 'should have been fulfilled');
  equal(didRejectCount, 0, 'should not have been rejected');

  equal(get(proxy, 'content'),     value, 'expects the proxy to have content');
  equal(get(proxy, 'reason'),      undefined, 'expects the proxy to still have no reason');
  equal(get(proxy, 'isPending'),   false, 'expects the proxy to indicate that it is no longer loading');
  equal(get(proxy, 'isSettled'),   true,  'expects the proxy to indicate that it is settled');
  equal(get(proxy, 'isRejected'),  false, 'expects the proxy to indicate that it is not rejected');
  equal(get(proxy, 'isFulfilled'), true,  'expects the proxy to indicate that it is fulfilled');

  Ember.run(deferred, 'resolve', value);

  equal(didFulfillCount, 1, 'should still have been only fulfilled once');
  equal(didRejectCount,  0, 'should still not have been rejected');

  Ember.run(deferred, 'reject', value);

  equal(didFulfillCount, 1, 'should still have been only fulfilled once');
  equal(didRejectCount,  0, 'should still not have been rejected');

  equal(get(proxy, 'content'),     value, 'expects the proxy to have still have same content');
  equal(get(proxy, 'reason'),      undefined, 'expects the proxy still to have no reason');
  equal(get(proxy, 'isPending'),   false, 'expects the proxy to indicate that it is no longer loading');
  equal(get(proxy, 'isSettled'),   true,  'expects the proxy to indicate that it is settled');
  equal(get(proxy, 'isRejected'),  false, 'expects the proxy to indicate that it is not rejected');
  equal(get(proxy, 'isFulfilled'), true,  'expects the proxy to indicate that it is fulfilled');

  // rest of the promise semantics are tested in directly in RSVP
});

test("rejection", function(){
  var reason = new Error("failure");
  var deferred = Ember.RSVP.defer();
  var proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  var didFulfillCount = 0;
  var didRejectCount  = 0;

  proxy.then(function(){
    didFulfillCount++;
  }, function(){
    didRejectCount++;
  });

  equal(get(proxy, 'content'),     undefined, 'expects the proxy to have no content');
  equal(get(proxy, 'reason'),      undefined, 'expects the proxy to have no reason');
  equal(get(proxy, 'isPending'),   true,  'expects the proxy to indicate that it is loading');
  equal(get(proxy, 'isSettled'),   false, 'expects the proxy to indicate that it is not settled');
  equal(get(proxy, 'isRejected'),  false, 'expects the proxy to indicate that it is not rejected');
  equal(get(proxy, 'isFulfilled'), false, 'expects the proxy to indicate that it is not fulfilled');

  equal(didFulfillCount, 0, 'should not yet have been fulfilled');
  equal(didRejectCount, 0, 'should not yet have been rejected');

  Ember.run(deferred, 'reject', reason);

  equal(didFulfillCount, 0, 'should not yet have been fulfilled');
  equal(didRejectCount, 1, 'should have been rejected');

  equal(get(proxy, 'content'),     undefined, 'expects the proxy to have no content');
  equal(get(proxy, 'reason'),      reason, 'expects the proxy to have a reason');
  equal(get(proxy, 'isPending'),   false, 'expects the proxy to indicate that it is not longer loading');
  equal(get(proxy, 'isSettled'),   true,  'expects the proxy to indicate that it is settled');
  equal(get(proxy, 'isRejected'),  true, 'expects the proxy to indicate that it is  rejected');
  equal(get(proxy, 'isFulfilled'), false,  'expects the proxy to indicate that it is not fulfilled');

  Ember.run(deferred, 'reject', reason);

  equal(didFulfillCount, 0, 'should stll not yet have been fulfilled');
  equal(didRejectCount, 1, 'should still remain rejected');

  Ember.run(deferred, 'resolve', 1);

  equal(didFulfillCount, 0, 'should stll not yet have been fulfilled');
  equal(didRejectCount, 1, 'should still remain rejected');

  equal(get(proxy, 'content'),     undefined, 'expects the proxy to have no content');
  equal(get(proxy, 'reason'),      reason, 'expects the proxy to have a reason');
  equal(get(proxy, 'isPending'),   false, 'expects the proxy to indicate that it is not longer loading');
  equal(get(proxy, 'isSettled'),   true,  'expects the proxy to indicate that it is settled');
  equal(get(proxy, 'isRejected'),  true, 'expects the proxy to indicate that it is  rejected');
  equal(get(proxy, 'isFulfilled'), false,  'expects the proxy to indicate that it is not fulfilled');
});

test("unhandled rejects still propogate to RSVP.on('error', ...) ", function(){
  expect(1);

  Ember.RSVP.on('error', onerror);
  Ember.RSVP.off('error', Ember.RSVP.onerrorDefault);

  var expectedReason = new Error("failure");
  var deferred = Ember.RSVP.defer();

  var proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  var promise = proxy.get('promise');

  function onerror(reason) {
    equal(reason, expectedReason, 'expected reason');
  }

  Ember.RSVP.on('error', onerror);
  Ember.RSVP.off('error', Ember.RSVP.onerrorDefault);

  Ember.run(deferred, 'reject', expectedReason);

  Ember.RSVP.on('error', Ember.RSVP.onerrorDefault);
  Ember.RSVP.off('error', onerror);

  Ember.run(deferred, 'reject', expectedReason);

  Ember.RSVP.on('error', Ember.RSVP.onerrorDefault);
  Ember.RSVP.off('error', onerror);
});

test("should work with promise inheritance", function(){
  function PromiseSubclass() {
    Ember.RSVP.Promise.apply(this, arguments);
  }

  PromiseSubclass.prototype = Ember.create(Ember.RSVP.Promise.prototype);
  PromiseSubclass.prototype.constructor = PromiseSubclass;
  PromiseSubclass.cast = Ember.RSVP.Promise.cast;

  var proxy = ObjectPromiseProxy.create({
    promise: new PromiseSubclass(function(){ })
  });

  ok(proxy.then() instanceof PromiseSubclass, 'promise proxy respected inheritence');
});
