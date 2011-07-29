// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;

/**
  @class

  Recognizes a multi-touch tap gesture. Tap gestures allow for a certain amount
  of wiggle-room between a start and end of a touch. Taps are discrete gestures
  so only tapStart() and tapEnd() will get fired on a view.

    var myview = SC.View.create({
      elementId: 'gestureTest',
      tapStart: function(recognizer) {
        $('#gestureTest').css('background','green');
      },

      tapEnd: function(recognizer) {
        $('#gestureTest').css('background','yellow');
      }
    })

  @extends SC.Gesture
*/
SC.TapGestureRecognizer = SC.Gesture.extend({

  numberOfTouches: 1,
  numberOfTaps: 1,
  MULTITAP_DELAY: 150,

  gestureIsDiscrete: true,
  _initialLocation: null,

  _waitingInterval: null,
  _waitingForMoreTouches: false,
  _moveThreshold: 10,

  shouldBegin: function() {
    return this._numActiveTouches === get(this, 'numberOfTaps');
  },

  didBegin: function() {
    this._initialLocation = this.centerPointForTouches(this._touches);

    if (this._numActiveTouches < get(this, 'numberOfTaps')) {
      this._waitingForMoreTouches = true;
      this._waitingInterval = window.setInterval(this._intervalFired,this.MULTITAP_DELAY);
    }
  },

  shouldEnd: function() {
    var currentLocation = this.centerPointForTouches(this._touches);

    var x = this._initialLocation.x;
    var y = this._initialLocation.y;
    var x0 = currentLocation.x;
    var y0 = currentLocation.y;

    var distance = Math.sqrt((x -= x0) * x + (y -= y0) * y);

    return (Math.abs(distance) < this._moveThreshold) && !this._waitingForMoreTouches;
  },

  didEnd: function() {
    this._initialLocation = null;
  },

  didCancel: function() {
    this._initialLocation = null;
  },

  _intervalFired: function() {
    window.clearInterval(this._waitingInterval);
    _waitingForMoreTouches = false;
  }
});

SC.Gestures.register('tap', SC.TapGestureRecognizer);
