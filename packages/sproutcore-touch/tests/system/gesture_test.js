// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set;
var get = SC.get;

var gesture = SC.Gesture.create();

module("SC.Gesture");

test("distance", function() {
  var distance;

  distance = gesture.distance([{pageX:0,pageY:0},{pageX:10,pageY:0}]);
  equals(distance,10,'x distance');

  distance = gesture.distance([{pageX:0,pageY:0},{pageX:0,pageY:10}]);
  equals(distance,10,'y distance');

  distance = gesture.distance([{pageX:0,pageY:0},{pageX:0,pageY:0}]);
  equals(distance,0,'0 distance');
});

test("centerPoint", function() {
  var point;

  point = gesture.centerPointForTouches({pageX:0,pageY:0},{pageX:10,pageY:0});
  equals(point.x,5,'x distance');
  equals(point.y,0,'x distance');

  point = gesture.centerPointForTouches({pageX:0,pageY:0},{pageX:0,pageY:10});
  equals(point.x,0,'y distance');
  equals(point.y,5,'y distance');

  point = gesture.centerPointForTouches({pageX:0,pageY:0},{pageX:0,pageY:0});
  equals(point.x,0,'0 distance');
  equals(point.y,0,'0 distance');
});

test("notifyViewOfGestureEvent", function() {
  var numCalled = 0, dataCalled, gestureCalled;
  var view = SC.Object.create({
    touchStart: function(recognizer, data) {
      dataCalled = data;
      gestureCalled = recognizer
      numCalled++;
    }
  });

  gesture.notifyViewOfGestureEvent(view, 'touchStart', 10);

  equals(numCalled,1,'called once');
  equals(dataCalled,10,'data passed through');
  equals(gestureCalled,gesture,'gesture passed through');
});

