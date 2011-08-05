// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set;
var get = SC.get;

module("SC.Gestures");

test("register new gestures", function() {
  var myGesture = SC.Gesture.create({
    isMyGesture: true
  });

  SC.Gestures.register('myGesture',myGesture);

  var newGestures = SC.Gestures.knownGestures();

  equals(newGestures['myGesture'],myGesture, "registered gesture is added");
});


test("register new gestures", function() {
  var myGesture = SC.Gesture.create({
    isMyGesture: true
  });

  SC.Gestures.register('myNewGesture',myGesture);

  var caught = false;

  try {
    SC.Gestures.register('myNewGesture',myGesture);
  } catch (e) {
    caught = true;
  }

  ok(caught);
});

test("unregister a gesture", function() {
  var myGesture = SC.Gesture.create({
    isMyGesture: true
  });

  SC.Gestures.register('myGesture2',myGesture);

  var newGestures = SC.Gestures.knownGestures();

  equals(newGestures['myGesture2'],myGesture, "registered gesture is added");

  SC.Gestures.unregister('myGesture2');

  newGestures = SC.Gestures.knownGestures();
  equals(newGestures['myGesture2'],undefined, "registered gesture is unregistered");
});

