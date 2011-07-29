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
  // Initial is global to view, starting is per-gesture
  _initialDistanceBetweenTouches: null,
  _startingDistanceBetweenTouches: null,

  _deltaThreshold: 5,
  _initialScale: 1,

  scale: 1,

  didBecomePossible: function() {
    this._startingDistanceBetweenTouches = this.distance(this._touches);

    if (!this._initialDistanceBetweenTouches) {
      // We only want to save the initial distance between touches the first time
      // and not subsequent gestures. This is because the css3 scale3d transform
      // requires the value of scale to be relative to its original size, so if
      // we want the scaling to be smooth when the user tries to pinch a second
      // time, we need to remember what the first distance was and compare
      // the current distance to it. It's a bit insane, but it lets the user
      // apply the scale value directly to the css which is almost always what
      // they want to do.
      this._initialDistanceBetweenTouches = this._startingDistanceBetweenTouches
    }

    this._initialScale = get(this, 'scale');
  },

  shouldBegin: function() {
    var currentDistanceBetweenTouches = this.distance(this._touches);

    return Math.abs(currentDistanceBetweenTouches - this._startingDistanceBetweenTouches) >= this._deltaThreshold;
  },

  didChange: function() {
    var currentDistanceBetweenTouches = this.distance(this._touches);
    var scale = get(this, 'scale');

    var nominator = currentDistanceBetweenTouches;
    var denominator = this._startingDistanceBetweenTouches;

    this._previousScale = scale;
    scale = Math.round((this._initialScale * (nominator/denominator))*sigFigs)/sigFigs;

    set(this, 'scale', scale);
  },

  didEnd: function() {
    this._initialScale = 1;
  },

  eventWasRejected: function() {
    set(this, 'scale', this._previousScale);
  }
});

SC.Gestures.register('pinch', SC.PinchGestureRecognizer);
