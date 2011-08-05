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

  You can specify how many touches the gesture requires to start using the numberOfRequiredTouches
  property, which you can set in the panOptions hash:

    var myview = SC.View.create({
      panOptions: {
        numberOfRequiredTouches: 3
      }
      ...
    })

  And you can also specify the number of taps required for the gesture to fire using the numberOfTaps
  property.

  @extends SC.Gesture
*/
SC.TapGestureRecognizer = SC.Gesture.extend({

  /**
    The translation value which represents the current amount of movement that has been applied
    to the view. You would normally apply this value directly to your element as a 3D
    transform.

    @type Location
  */
  numberOfTaps: 1,

  //..................................................
  // Private Methods and Properties

  /** @private */
  MULTITAP_DELAY: 150,

  /** @private */
  gestureIsDiscrete: true,

  /** @private */
  _initialLocation: null,

  /** @private */
  _waitingInterval: null,

  /** @private */
  _waitingForMoreTouches: false,

  /** @private */
  _moveThreshold: 10,

  shouldBegin: function() {
    return get(this.touches,'length') === get(this, 'numberOfRequiredTouches');
  },

  didBegin: function() {
    this._initialLocation = this.centerPointForTouches(get(this.touches,'touches'));

    if (get(this.touches,'length') < get(this, 'numberOfTaps')) {
      this._waitingForMoreTouches = true;
      this._waitingInterval = window.setInterval(this._intervalFired,this.MULTITAP_DELAY);
    }
  },

  shouldEnd: function() {
    var currentLocation = this.centerPointForTouches(get(this.touches,'touches'));

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
