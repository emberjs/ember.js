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

  gestureIsDiscrete: true,

  _initialLocation: null,
  _moveThreshold: 10,

  gestureBecamePossible: function() {
    this._initialLocation = this.centerPointForTouches(this._touches);
  },

  gestureShouldAccept: function() {
    var currentLocation = this.centerPointForTouches(this._touches);
    var distance = this.distance([this._initialLocation,currentLocation]);

    return distance <= this._moveThreshold;
  }
});

SC.Gestures.register('tap', SC.TapGestureRecognizer);
