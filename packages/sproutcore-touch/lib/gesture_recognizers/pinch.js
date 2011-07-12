// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;

/**

  If there are two touches
    at start, calculate distance
    when the touches move, recalculate distance
    calculate scale from change in distance
 
 */
SC.PinchGestureRecognizer = SC.Gesture.extend({
  numberOfTouches: 2,

  _currentDistanceBetweenTouches: null,
  _previousDistanceBetweenTouches: null,
  _scaleThreshold: 0,

  scale: 0,

  touchStart: function(evt, view) {
    console.group('Pinch');
    console.log('1: Pinch got start');
    
    var touches = evt.originalEvent.targetTouches;
    var len = touches.length;

    if (len === 1) {
      this.state = SC.Gesture.WAITING_FOR_TOUCHES;
    }
    else {
      touches = touches.slice(0,2);
      this.state = SC.Gesture.POSSIBLE;
    }

    this.redispatchEventToView(view,'touchstart');
  },

  touchMove: function(evt, view) {

  },

  touchEnd: function(evt, view) {
    this._state = SC.Gestures.ENDED_STATE;

    console.groupEnd();
  },

  touchCancel: function(evt, view) {
    this._state = SC.Gestures.CANCELLED_STATE;

    console.groupEnd();
  }
});

SC.Gestures.register('pinch', SC.PinchGestureRecognizer);
