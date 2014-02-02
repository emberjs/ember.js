// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// Author: Richard Klancer <rpk@pobox.com>

/*globals module test ok equals same stop start */

module("Problematic SC.ObserverSet.getMethods() removal", {
  setup: function () {
    SC.LOG_OBSERVERS = YES;
  },
  teardown: function () {
    SC.LOG_OBSERVERS = NO;
  }
});

// This test succeeds using master up to commit 5826c745874f903f1e4765e5a2bcb5244ff72113 and using the 1-4-stable HEAD
// This test fails using subsequent master commit c78e1bf25087a3ebd553dbc513923e0d32d09f7b
// It triggers an error at line 987 of frameworks/system/runtime/mixins/observable.js (in the method
// SC.Observable._notifyPropertyObservers()) as of current master commit, 789fe805cd08976b7aab1c346c71cf22b78b7285

test("Observers that remove themselves should fire at least once, and shouldn't cause an error", function () {
  expect(1);

  var observed = SC.Object.create({
    key: 'val'
  });

  var observer1, observer2;
  var observerFired = NO;

  function removeObservers() {
    observed.removeObserver('key', observer1);
    observed.removeObserver('key', observer2);
  }

  observer1 = function () {
    observerFired = YES;
    removeObservers();
  };
  observer2 = function () {
    observerFired = YES;
    removeObservers();
  };

  observed.addObserver('key', observer1);
  observed.addObserver('key', observer2);

  observed.set('key', 'newval');

  ok(observerFired, "At least one observer should have fired.");
});

/**
  This test highlights a problem with SC.ObserverSet.  It would clear out the
  method tracking on the target tracking hash, but when the number of methods
  tracked went to zero, it never cleared out the target.

  This is bad if a core object is bound to repeatedly by dynamically created
  objects.  Each new object tracking creates a new hash in the observer set
  that is never reclaimed.

  Here's an example that would create 3,000 empty hashes in
  coreOb._kvo_observers_key._members:

    obs = [];
    window.coreOb = SC.Object.create({ key: '1' });
    SC.run(function() {
      for (var i = 2999; i >= 0; i--) {
        obs.push(SC.Object.create({ myKeyBinding: SC.Binding.from('coreOb.key') }));
      }
    });

    SC.run(function() {
      for (var i = obs.length - 1; i >= 0; i--) {
        obs.pop().destroy();
      }
    });


  The fix is to have SC.ObserverSet remove the target hash when the number of
  methods for the target goes to zero.
*/
test("Removing all the methods on a target should clear the internal tracking of that target", function() {
  var methodGuid1, methodGuid2,
    target = {},
    method1 = function () { }, method2 = function () { },
    observerSet,
    targetGuid;

  observerSet = SC.ObserverSet.create();

  targetGuid = SC.guidFor(target);
  methodGuid1 = SC.guidFor(method1);
  methodGuid2 = SC.guidFor(method2);

  equals(observerSet.members.length, 0, "The ObserverSet should have a members length of");

  observerSet.add(target, method1);
  observerSet.add(target, method2);
  equals(observerSet.members.length, 2, "The ObserverSet should have a members length of");
  ok(observerSet._members[targetGuid], "The ObserverSet should be tracking methods for the target: %@".fmt(targetGuid));
  ok(!SC.none(observerSet._members[targetGuid][methodGuid1]), "The ObserverSet should be tracking method: %@ for the target: %@".fmt(methodGuid1, targetGuid));
  ok(!SC.none(observerSet._members[targetGuid][methodGuid2]), "The ObserverSet should be tracking method: %@ for the target: %@".fmt(methodGuid2, targetGuid));

  observerSet.remove(target, method1);
  equals(observerSet.members.length, 1, "The ObserverSet should have a members length of");
  ok(observerSet._members[targetGuid], "The ObserverSet should be tracking methods for the target: %@".fmt(targetGuid));
  ok(SC.none(observerSet._members[targetGuid][methodGuid1]), "The ObserverSet should not be tracking method: %@ for the target: %@".fmt(methodGuid1, targetGuid));
  ok(!SC.none(observerSet._members[targetGuid][methodGuid2]), "The ObserverSet should be tracking method: %@ for the target: %@".fmt(methodGuid2, targetGuid));

  observerSet.remove(target, method2);
  equals(observerSet.members.length, 0, "The ObserverSet should have a members length of");
  ok(!observerSet._members[targetGuid], "The ObserverSet should not be tracking methods for the target: %@".fmt(targetGuid));
});
