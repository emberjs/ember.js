// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;
var x = 0;

/**
  @class

  Recognizes a multi-touch pan gesture. Pan gestures require a specified number
  of fingers to move and will record and update the center point between the
  touches.

  For panChange events, the pan gesture recognizer includes a translation property
  which can be applied as a CSS transform directly. Translation values are hashes
  which contain an x and a y value.

    var myview = SC.View.create({
      elementId: 'gestureTest',
      panChange: function(recognizer) {
        var translation = recognizer.get('translation');
        this.$().css('-webkit-transform','translate3d('+translate.x+'px,'+translate.y+'px,0)');
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

  @extends SC.Gesture
*/
SC.PanGestureRecognizer = SC.Gesture.extend({
  numberOfTouches: 2,

  /**
    The translation value which represents the current amount of movement that has been applied
    to the view. You would normally apply this value directly to your element as a 3D
    transform.

    @type Location
  */
  translation: null,

  //..................................................
  // Private Methods and Properties

  /**
    Track initial centerpoint between touches so we can make calculations based off
    of it.

    @private
    @type Number
  */
  _initialLocation: null,

  /**
    Used to measure offsets

    @private
    @type Number
  */
  _previousTranslation: null,

  /**
    Used to make translations relative to current position, rather than starting position.

    @private
    @type Number
  */
  _totalTranslation: null,


  /**
    The pixel distance that the fingers need to move before this gesture is recognized.

    @private
    @type Number
  */
  _translationThreshold: 5,

  init: function() {
    this._super();
    var translation = this._totalTranslation = {x:0,y:0};
    set(this, 'translation', translation);
  },

  didBecomePossible: function() {
    this._initialLocation = this.centerPointForTouches(this._touches);
  },

  shouldBegin: function() {
    var currentLocation = this.centerPointForTouches(this._touches);

    var x = this._initialLocation.x;
    var y = this._initialLocation.y;
    var x0 = currentLocation.x;
    var y0 = currentLocation.y;

    var distance = Math.sqrt((x -= x0) * x + (y -= y0) * y);
    return distance >= this._translationThreshold;
  },

  didChange: function() {
    var initial = this._initialLocation;

    this._previousTranslation = get(this, 'translation');
    var current = this.centerPointForTouches(this._touches);

    // We add total translation because css3 transforms are absolute not relative
    current.x = (current.x - initial.x) + this._totalTranslation.x;
    current.y = (current.y - initial.y) + this._totalTranslation.y;

    set(this, 'translation', current);
  },

  eventWasRejected: function() {
    set(this, 'translation', this._previousTranslation);
  },

  didEnd: function(evt, view, manager) {
    var translation = get(this, 'translation');

    this._totalTranslation.x = translation.x;
    this._totalTranslation.y = translation.y;
  }
});

SC.Gestures.register('pan', SC.PanGestureRecognizer);
