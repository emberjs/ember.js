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
    Track starting distance between touches per gesture.

    @private
    @type Number
  */
  _startingDistanceBetweenTouches: null,

  /**
    Used for measuring velocity

    @private
    @type Number
  */
  _previousTimestamp: null,

  /**
    Used for measuring velocity and scale

    @private
    @type Number
  */  
  _previousDistance: 0,

  /**
    The pixel distance that the fingers need to get closer/farther away by before
    this gesture is recognized.

    @private
    @type Number
  */
  _deltaThreshold: 5,

  /**
    Used for rejected events

    @private
    @type Number
  */
  _previousScale: 1,

  /**
    @private
  */
  didBecomePossible: function() {
    this._startingDistanceBetweenTouches = this.distance(get(this.touches,'touches'));
    this._previousDistance = this._startingDistanceBetweenTouches;
    this._previousTimestamp = get(this.touches,'timestamp');
  },

  shouldBegin: function() {
    var currentDistanceBetweenTouches = this.distance(get(this.touches,'touches'));

    return Math.abs(currentDistanceBetweenTouches - this._startingDistanceBetweenTouches) >= this._deltaThreshold;
  },

  didChange: function() {
    var scale = this._previousScale = get(this, 'scale');
    var timeDifference = this.touches.timestamp - this._previousTimestamp;
    var currentDistanceBetweenTouches = this.distance(get(this.touches,'touches'));
    var distanceDifference = (currentDistanceBetweenTouches - this._previousDistance);

    set(this, 'velocity', distanceDifference / timeDifference);
    set(this, 'scale', currentDistanceBetweenTouches / this._previousDistance);
    
    this._previousTimestamp = get(this.touches,'timestamp');
    this._previousDistance = currentDistanceBetweenTouches;
  },

  eventWasRejected: function() {
    set(this, 'scale', this._previousScale);
  }
});

SC.Gestures.register('pinch', SC.PinchGestureRecognizer);
