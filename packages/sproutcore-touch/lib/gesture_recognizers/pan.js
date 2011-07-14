// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;
var x = 0;

var sigFigs = 100;

SC.PanGestureRecognizer = SC.Gesture.extend({
  numberOfTouches: 2,

  _initialLocation: null,
  _totalTranslation: null,
  _accumulated: null,
  _deltaThreshold: 0,

  init: function() {
    this._super();

    this._totalTranslation = {x:0,y:0};
    this._accumulated = {x:0,y:0};
  },

  _centerPointForTouches: function(first, second) {
    var location = {x: null, y: null};

    location.x = Math.round(((first.pageX + second.pageX) / 2)*sigFigs)/sigFigs;
    location.y = Math.round(((first.pageY + second.pageY) / 2)*sigFigs)/sigFigs;

    return location;
  },

  _logPoint: function(pre, point) {
      console.log(pre+' ('+point.x+','+point.y+')');
  },

  touchStart: function(evt, view) {
    var touches = evt.originalEvent.targetTouches;
    var len = touches.length;

    if (len < get(this, 'numberOfTouches')) {
      this.state = SC.Gesture.WAITING_FOR_TOUCHES;
    }
    else {
      this.state = SC.Gesture.POSSIBLE;
      this._initialLocation = this._centerPointForTouches(touches[0],touches[1]);
    }
    
    this.redispatchEventToView(view,'touchstart');
  },

  touchMove: function(evt, view) {
    var touches = evt.originalEvent.targetTouches;
    if(touches.length !== get(this, 'numberOfTouches')) { return; }

    var initial = this._initialLocation;

    var current = this._centerPointForTouches(touches[0],touches[1]);

    current.x -= initial.x; 
    current.y -= initial.y; 
    
    current.x = this._totalTranslation.x + current.x;
    current.y = this._totalTranslation.y + current.y;

    this._accumulated.x = current.x;
    this._accumulated.y = current.y;

    if (this.state === SC.Gesture.POSSIBLE) {
      this.state = SC.Gesture.BEGAN;
      this.notifyViewOfGestureEvent(view,'panStart', current);

      evt.preventDefault();
    }
    else if (this.state === SC.Gesture.BEGAN || this.state === SC.Gesture.CHANGED) {
      this.state = SC.Gesture.CHANGED;
      this.notifyViewOfGestureEvent(view,'panChange', current);

      evt.preventDefault();
    }
    else {
      this.redispatchEventToView(view,'touchmove');
    }
  },

  touchEnd: function(evt, view) {
    var touches = evt.originalEvent.targetTouches;

    if(touches.length !== 0) {
      this.redispatchEventToView(view,'touchend');
      return;
    }

    this._totalTranslation.x = this._accumulated.x;
    this._totalTranslation.y = this._accumulated.y;

    this._accumulated.x = 0;
    this._accumulated.y = 0;

    this.state = SC.Gesture.ENDED;
  },

  touchCancel: function(evt, view) {
    this.state = SC.Gesture.CANCELLED;
    this.redispatchEventToView(view,'touchcancel');
  }
});

SC.Gestures.register('pan', SC.PanGestureRecognizer);
