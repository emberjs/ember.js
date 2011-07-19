// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;

var sigFigs = 100;

/** 
  @class
 
  Recognizes a multi-touch pinch gesture. Pinch gestures require two fingers
  to move closer to each other or further apart.

  For pinchChange events, the pinch gesture recognizer passes in a scale value
  which can be applied as a CSS transform directly.  

    var myview = SC.View.create({
      elementId: 'gestureTest',
      pinchChange: function(recognizer, scale) {
        this.$().css('-webkit-transform','scale3d('+scale+','+scale+',1)');
      }
    })

  @extends SC.Gesture
*/
SC.PinchGestureRecognizer = SC.Gesture.extend({
  numberOfTouches: 2,
  
  _touches: {},
  _numActiveTouches: 0,

  // Initial is global, starting is per-gesture event
  _initialDistanceBetweenTouches: null,
  _startingDistanceBetweenTouches: null,

  _initialDistanceBetweenTouches: null,
  _deltaThreshold: 0,
  _multiplier: 1,

  _initialScale: 1,
  scale: 1,

  _touches: null,

  init: function() {
    this._super();
    this._touches = {};
  },

  touchStart: function(evt, view, manager) {
    var targetTouches = evt.originalEvent.targetTouches;
    var _touches = this._touches;

    //Collect touches by their identifiers
    for (var i=0, l=targetTouches.length; i<l; i++) {
      var touch = targetTouches[i];

      if(_touches[touch.identifier] === undefined) {
        _touches[touch.identifier] = touch;
        this._numActiveTouches++;
      }
    }

    if (this._numActiveTouches < get(this, 'numberOfTouches')) {
      this.state = SC.Gesture.WAITING_FOR_TOUCHES;

    // We have enough touches to switch to a possible state
    } else {
      this.state = SC.Gesture.POSSIBLE;
      var touches = [];

      for (var touch in _touches) {
        if (_touches.hasOwnProperty(touch)) {
          touches.push(_touches[touch]);
        }
      }

      this._startingDistanceBetweenTouches = this.distance(touches);

      if (!this._initialDistanceBetweenTouches) {
        // We only want to save the initial distance between touches the first time
        // and not subsequent times. This is because the css3 scale3d transform 
        // requires the value of scale to be relative to its original size, so if
        // we want the scaling to be smooth when the user tries to pinch a second 
        // time, we need to remember what the first distance was and compare 
        // the current distance to it. It's a bit insane, but it lets the user
        // apply the scale value directly to the css which is almost always what
        // they want to do.
        this._initialDistanceBetweenTouches = this._startingDistanceBetweenTouches
      }

      this._initialScale = this.scale;
    }
    
    manager.redispatchEventToView(view,'touchstart', evt);
  },

  touchMove: function(evt, view, manager) {
    var changedTouches = evt.originalEvent.changedTouches;
    var _touches = this._touches;

    for (var i=0, l=changedTouches.length; i<l; i++) {
      var touch = changedTouches[i];
      if (_touches[touch.identifier] === undefined) {
        throw new SC.Error('touchMove somehow got a changedTouch that was not being tracked');
      }

      _touches[touch.identifier] = touch;
    }
    

    var touches = [];

    for (var touch in _touches) {
      if (_touches.hasOwnProperty(touch)) {
        touches.push(_touches[touch]);
      }
    }

    var currentDistanceBetweenTouches = this.distance(touches);
    console.log(currentDistanceBetweenTouches);

    var nominator = currentDistanceBetweenTouches;
    var denominator = this._startingDistanceBetweenTouches;
    this.scale = this._initialScale * Math.round((nominator/denominator)*sigFigs)/sigFigs;

    var differenceInDistance = currentDistanceBetweenTouches - this._startingDistanceBetweenTouches;

    if (this.state === SC.Gesture.POSSIBLE && Math.abs(differenceInDistance) >= this._deltaThreshold) {
      this.state = SC.Gesture.BEGAN;
      this.notifyViewOfGestureEvent(view,'pinchStart', this.scale);

      evt.preventDefault();
    } else if (this.state === SC.Gesture.BEGAN || this.state === SC.Gesture.CHANGED) {
      this.state = SC.Gesture.CHANGED;
      this.notifyViewOfGestureEvent(view,'pinchChange', this.scale);

      evt.preventDefault();
    } else {
      manager.redispatchEventToView(view,'touchmove', evt);
    }
  },

  touchEnd: function(evt, view, manager) {
    if (this.state !== SC.Gesture.ENDED) {
      this._resetState();
      this.state = SC.Gesture.ENDED;
      this.notifyViewOfGestureEvent(view,'pinchEnd');
    }

    manager.redispatchEventToView(view,'touchmove', evt);
  },

  touchCancel: function(evt, view, manager) {
    if (this.state !== SC.Gesture.CANCELLED) {
      this._resetState();
      this.state = SC.Gesture.CANCELLED;
      this.notifyViewOfGestureEvent(view,'pinchCancel');
    } else {
      manager.redispatchEventToView(view,'touchcancel', evt);
    }
  },

  _resetState: function() {
    this._touches = {};
    this._numActiveTouches = 0;
  }
});

SC.Gestures.register('pinch', SC.PinchGestureRecognizer);
