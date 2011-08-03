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

  Recognizes a multi-touch pinch gesture. Pinch gestures require a specified number
  of fingers to move and will record and update the scale.

  For pinchChange events, the pinch gesture recognizer includes a scale property
  which can be applied as a CSS transform directly.

    var myview = SC.View.create({
      elementId: 'gestureTest',
      pinchChange: function(recognizer) {
        var scale = recognizer.get('scale');
        this.$().css('-webkit-transform','scale3d('+scale+','+scale+',1)');
      }
    })

  You can specify how many touches the gesture requires to start using the numberOfRequiredTouches
  property, which you can set in the pinchOptions hash:

    var myview = SC.View.create({
      pinchOptions: {
        numberOfRequiredTouches: 3
      }
      ...
    })


  @extends SC.Gesture
*/
SC.PinchGestureRecognizer = SC.Gesture.extend({

  /**
    The scale value which represents the current amount of scaling that has been applied
    to the view. You would normally apply this value directly to your element as a 3D
    scale.

    @type Number
  */
  scale: 1,

  numberOfRequiredTouches: 2,

  //..................................................
  // Private Methods and Properties

  /**
    Track initial distance between touches so we can make calculations based off
    of it. This persists across gestures.

    @private
    @type Number
  */
  _initialDistanceBetweenTouches: null,

  /**
    Track starting distance between touches per gesture.

    @private
    @type Number
  */
  _startingDistanceBetweenTouches: null,


  /**
    The pixel distance that the fingers need to get closer/farther away by before
    this gesture is recognized.

    @private
    @type Number
  */
  _deltaThreshold: 5,

  /**
    Save the scale at the beginning of the gesture

    @private
    @type Number
  */
  _initialScale: 1,


  /**
    @private
  */
  didBecomePossible: function() {
    this._startingDistanceBetweenTouches = this.distance(this.touches);

    if (!this._initialDistanceBetweenTouches) {
      this._initialDistanceBetweenTouches = this._startingDistanceBetweenTouches
    }

    this._initialScale = get(this, 'scale');
  },

  shouldBegin: function() {
    var currentDistanceBetweenTouches = this.distance(this.touches);

    return Math.abs(currentDistanceBetweenTouches - this._startingDistanceBetweenTouches) >= this._deltaThreshold;
  },

  didChange: function() {
    var currentDistanceBetweenTouches = this.distance(this.touches);
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
