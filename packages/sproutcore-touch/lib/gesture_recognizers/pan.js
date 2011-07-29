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

  For pahChange events, the pan gesture recognizer passes in a translation value
  which can be applied as a CSS transform directly. Translation values are hashes
  which contain an x and a y value.

    var myview = SC.View.create({
      elementId: 'gestureTest',
      panChange: function(recognizer, translation) {
        this.$().css('-webkit-transform','translate3d('+translate.x+'px,'+translate.y+'px,0)');
      }
    })

  @extends SC.Gesture
*/
SC.PanGestureRecognizer = SC.Gesture.extend({
  numberOfTouches: 2,

  _initialLocation: null,
  _previousTranslation: null,
  _totalTranslation: null,

  translation: null,

  init: function() {
    this._super();
    var translation = this._totalTranslation = {x:0,y:0};
    set(this, 'translation', translation);
  },

  didBecomePossible: function() {
    this._initialLocation = this.centerPointForTouches(this._touches);
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
