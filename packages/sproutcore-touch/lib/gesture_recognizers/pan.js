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
  
  _touches: null,
  _numActiveTouches: 0,

  _initialLocation: null,
  _totalTranslation: null,
  translation: null,
  _deltaThreshold: 0,

  _touches: null,

  init: function() {
    this._super();
    this._touches = {};
    this._totalTranslation = {x:0,y:0};
  },

  _logPoint: function(pre, point) {
    console.log(pre+' ('+point.x+','+point.y+')');
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
      this._initialLocation = this.centerPointForTouches(targetTouches);
    }
    
    manager.redispatchEventToView(view,'touchstart', evt);
  },

  touchMove: function(evt, view, manager) {
    if (this.state === SC.Gesture.WAITING_FOR_TOUCHES || this.state === SC.Gesture.ENDED || this.state === SC.Gesture.CANCELLED) {
      manager.redispatchEventToView(view,'touchmove', evt);
      return;
    }

    var changedTouches = evt.originalEvent.changedTouches;
    var _touches = this._touches;

    for (var i=0, l=changedTouches.length; i<l; i++) {
      var touch = changedTouches[i];
      _touches[touch.identifier] = touch;
    }

    var touches = [];

    for (var touch in _touches) {
      if (_touches.hasOwnProperty(touch)) {
        touches.push(_touches[touch]);
      }
    }

    var initial = this._initialLocation;

    var current = this.centerPointForTouches(touches);

    current.x -= initial.x; 
    current.y -= initial.y; 
    
    current.x = this._totalTranslation.x + current.x;
    current.y = this._totalTranslation.y + current.y;

    if (this.translation === null) {
      this.translation = {x:0,y:0};
    }

    if (this.state === SC.Gesture.POSSIBLE) {
      this.state = SC.Gesture.BEGAN;

      if (this.notifyViewOfGestureEvent(view,'panStart', current) !== false) {

        this.translation.x = current.x;
        this.translation.y = current.y;

        evt.preventDefault();
      }
    }
    else if (this.state === SC.Gesture.BEGAN || this.state === SC.Gesture.CHANGED) {
      this.state = SC.Gesture.CHANGED;

      var previousTranslation = this.translation

      if (this.notifyViewOfGestureEvent(view,'panChange', current) !== false) {

        this.translation.x = current.x;
        this.translation.y = current.y;

        evt.preventDefault();
      }
    }
    else {
      manager.redispatchEventToView(view,'touchmove', evt);
    }
  },

  touchEnd: function(evt, view, manager) {
    if (this.state !== SC.Gesture.ENDED) {
      this._resetState();
      this.state = SC.Gesture.ENDED;
      this.notifyViewOfGestureEvent(view,'panEnd');
    }

    if (this.translation) {
      this._totalTranslation.x = this.translation.x;
      this._totalTranslation.y = this.translation.y;
    }
  },

  touchCancel: function(evt, view, manager) {
    if (this.state !== SC.Gesture.CANCELLED) {
      this._resetState();
      this.state = SC.Gesture.CANCELLED;
      this.notifyViewOfGestureEvent(view,'panCancel');
    }
    else {
      manager.redispatchEventToView(view,'touchcancel', evt);
    }
  },

  _resetState: function() {
    this._touches = {};
    this._numActiveTouches = 0;
  }
});

SC.Gestures.register('pan', SC.PanGestureRecognizer);
