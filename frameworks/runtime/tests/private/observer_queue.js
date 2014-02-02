// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2010 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var callCount, obj;

module("SC.Observers.isObservingSuspended", {
  setup: function() {
    callCount = 0;

    obj = SC.Object.create({
      foo: "bar",

      fooDidChange: function() {
        callCount++;
      }.observes('foo')
    });
  }
});

test("suspending observers stops notification", function() {
  SC.Observers.suspendPropertyObserving();
  SC.Observers.suspendPropertyObserving();
  obj.set("foo");
  equals(callCount, 0, 'should not notify observer while suspended');

  SC.Observers.resumePropertyObserving();
  equals(callCount, 0, 'should not notify observer while still suspended');

  SC.Observers.resumePropertyObserving();
  equals(callCount, 1, 'should notify observer when resumed');

});

// ..........................................................
// SPECIAL CASES
//

// this test verifies a specific bug in the SC.Observing.propertyDidChange method.
test("suspended notifications should work when nesting property change groups", function() {

  SC.Observers.suspendPropertyObserving();
  obj.beginPropertyChanges();
  obj.set("foo");
  equals(callCount, 0, 'should not notify observer while suspended');

  obj.endPropertyChanges();
  equals(callCount, 0, 'should not notify observer while suspended');

  SC.Observers.resumePropertyObserving();
  equals(callCount, 1, 'should notify observer when resumed');
});


module("SC.Observers.addObserver");

test("Object not yet instantiated", function() {
  var garage, car, observer;

  garage = SC.Object.create({
    car: SC.Object.extend({
      make: null
    })
  });

  car = garage.get('car');

  observer = SC.Object.create({
    callCount: 0,
    makeDidChange: function() {
      this.callCount += 1;
    }
  });

  ok(car.isClass, "The car object is not yet an instance, it's a class for now.");

  // 1. SC.Observers.addObserver should queue the class, waiting for it to be an instance
  SC.Observers.addObserver('car.make', observer, 'makeDidChange', garage);
  ok(SC.Observers.queue.some(function(el) { return el[1] === observer; }), "The observer should have been queued because the car object is a class, not an instance.");

  // 2. A call to SC.Observers.flush should leave the class in the queue because it's not yet an instance
  SC.Observers.flush(garage);
  ok(SC.Observers.queue.some(function(el) { return el[1] === observer; }), "The observer should still be in the queue.");

  // 3. After we instantiate the class, a call to SC.Observers.flush should remove the object from the queue...
  car = garage.car = car.create({ make: 'Renault' });
  SC.Observers.flush(garage);
  ok(!SC.Observers.queue.some(function(el) { return el[1] === observer; }), "The observer should have been removed from the queue.");

  // 4. ...and the observer should work
  car.set('make', 'Ferrari');
  equals(observer.callCount, 1, "The observer should have been alled once.");
});


