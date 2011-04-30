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

