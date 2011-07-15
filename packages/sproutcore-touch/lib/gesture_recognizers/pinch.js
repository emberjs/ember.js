// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;

var sigFigs = 100;

/**

  If there are two touches
    at start, calculate distance
    when the touches move, recalculate distance
    calculate scale from change in distance
 
 */
SC.PinchGestureRecognizer = SC.Gesture.extend({
  numberOfTouches: 2,

  // Initial is global, starting is per-gesture event
  _initialDistanceBetweenTouches: null,
  _startingDistanceBetweenTouches: null,

  _initialDistanceBetweenTouches: null,
  _deltaThreshold: 0,
  _multiplier: 1,

  _initialScale: 1,
  scale: 1,

  touchStart: function(evt, view, manager) {
    var touches = evt.originalEvent.targetTouches;
    var len = touches.length;

    if (len === 1) {
      this.state = SC.Gesture.WAITING_FOR_TOUCHES;
    }
    else {
      this.state = SC.Gesture.POSSIBLE;

      this._startingDistanceBetweenTouches = this.distance(touches[0],touches[1]);

      if (!this._initialDistanceBetweenTouches) {
        this._initialDistanceBetweenTouches = this._startingDistanceBetweenTouches
      }

      this._initialScale = this.scale;

    }
    
    manager.redispatchEventToView(view,'touchstart');
  },

  touchMove: function(evt, view, manager) {
    var state = this._state;
    var touches = evt.originalEvent.targetTouches;
    if(touches.length !== get(this, 'numberOfTouches')) { return; }

    var currentDistanceBetweenTouches = this.distance(touches[0],touches[1]) 

    if(window.billy) debugger

    var nominator = currentDistanceBetweenTouches;
    var denominator = this._startingDistanceBetweenTouches;
    this.scale = this._initialScale * Math.round((nominator/denominator)*sigFigs)/sigFigs;

    var differenceInDistance = currentDistanceBetweenTouches - this._startingDistanceBetweenTouches;

    if (this.state === SC.Gesture.POSSIBLE && Math.abs(differenceInDistance) >= this._deltaThreshold) {
      this.state = SC.Gesture.BEGAN;
      this.notifyViewOfGestureEvent(view,'pinchStart', this.scale);

      evt.preventDefault();
    }
    else if (this.state === SC.Gesture.BEGAN || this.state === SC.Gesture.CHANGED) {
      this.state = SC.Gesture.CHANGED;
      this.notifyViewOfGestureEvent(view,'pinchChange', this.scale);

      evt.preventDefault();
    }
    else {
      manager.redispatchEventToView(view,'touchmove');
    }
  },

  touchEnd: function(evt, view, manager) {
    this.state = SC.Gesture.ENDED;
    manager.redispatchEventToView(view,'touchend');
  },

  touchCancel: function(evt, view, manager) {
    this.state = SC.Gesture.CANCELLED;

    manager.redispatchEventToView(view,'touchcancel');
  }
});

SC.Gestures.register('pinch', SC.PinchGestureRecognizer);
