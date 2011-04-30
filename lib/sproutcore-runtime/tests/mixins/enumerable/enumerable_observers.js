// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
(function() {
  var observerObject, array;

  var willChangeStart, willChangeAdded, willChangeRemoved, willChangeSource, willChangeCallCount;
  var didChangeStart, didChangeAdded, didChangeRemoved, didChangeSource, didChangeCallCount;

  module("Enumerable Observers", {
    setup: function() {
      array = [1, 2, 3];

      observerObject = SC.Object.create({
        arrayContentWillChange: function(start, removedCount, addedCount, source) {
          willChangeStart = start;
          willChangeAdded = addedCount;
          willChangeRemoved = removedCount;
          willChangeSource = source;
          willChangeCallCount = willChangeCallCount ? willChangeCallCount++ : 1;
        },

        arrayContentDidChange: function(start, removedCount, addedCount, source) {
          didChangeStart = start;
          didChangeAdded = addedCount;
          didChangeRemoved = removedCount;
          didChangeSource = source;
          didChangeCallCount = didChangeCallCount ? didChangeCallCount++ : 1;
        }
      });

      array.addArrayObservers({
        target: observerObject,
        willChange: 'arrayContentWillChange',
        didChange: 'arrayContentDidChange'
      });
    }
  });

  test("should be called when an object is added to an enumerable", function() {
    array.pushObject(4);

    equals(willChangeCallCount, 1, "calls arrayContentWillChange once");
    equals(didChangeCallCount, 1, "calls arrayContentDidChange once");

    equals(didChangeSource.objectAt(willChangeStart), 4);
    equals(didChangeAdded, 1, "specifies one object added");
    equals(didChangeRemoved, 0, "specifies no objects removed");
  });

  test("should not be called when the observer is removed", function() {
    array.pushObject(4);
    equals(didChangeCallCount, 1, "precond - observer fires when added");
    didChangeCallCount = 0;

    array.removeArrayObservers({
      target: observerObject,
      willChange: 'arrayContentWillChange',
      didChange: 'arrayContentDidChange'
    });
    array.pushObject(5);
    equals(didChangeCallCount, 0, "observer does not fire after being removed");
  });

  test("should include both added and removed objects", function() {
    array.replace(1, 1, [6, 7, 8]);

    equals(willChangeStart, 1);
    equals(willChangeRemoved, 1);
    equals(willChangeAdded, 3);
    equals(willChangeSource, array);

    equals(didChangeStart, 1);
    equals(didChangeRemoved, 1);
    equals(didChangeAdded, 3);
    equals(didChangeSource, array);
  });
})();
