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
  _totalTranslation: null,
  _accumulated: null,
  _deltaThreshold: 0,

  init: function() {
    this._super();

    this._totalTranslation = {x:0,y:0};
  },


  _logPoint: function(pre, point) {
    console.log(pre+' ('+point.x+','+point.y+')');
  },

  touchStart: function(evt, view, manager) {
    var touches = evt.originalEvent.targetTouches;
    var len = touches.length;

    if (len < get(this, 'numberOfTouches')) {
      this.state = SC.Gesture.WAITING_FOR_TOUCHES;
    }
    else {
      this.state = SC.Gesture.POSSIBLE;
      this._initialLocation = this.centerPointForTouches(touches);
    }
    
    manager.redispatchEventToView(view,'touchstart', evt);
  },

  touchMove: function(evt, view, manager) {
    var touches = evt.originalEvent.targetTouches;
    if(touches.length !== get(this, 'numberOfTouches')) { return; }

    var initial = this._initialLocation;

    var current = this.centerPointForTouches(touches);

    current.x -= initial.x; 
    current.y -= initial.y; 
    
    current.x = this._totalTranslation.x + current.x;
    current.y = this._totalTranslation.y + current.y;

    if (this._accumulated === null) {
      this._accumulated = {x:0,y:0};
    }

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
      manager.redispatchEventToView(view,'touchmove', evt);
    }
  },

  touchEnd: function(evt, view, manager) {
    var touches = evt.originalEvent.targetTouches;

    if(touches.length !== 0 || this.state === SC.Gesture.ENDED) {
      manager.redispatchEventToView(view,'touchend', evt);
      return;
    }

    if (this._accumulated) {
      this._totalTranslation.x = this._accumulated.x;
      this._totalTranslation.y = this._accumulated.y;
    }

    this.state = SC.Gesture.ENDED;
    this.notifyViewOfGestureEvent(view,'panEnd');
  },

  touchCancel: function(evt, view, manager) {
    if (this.state !== SC.Gesture.CANCELLED) {
      this.state = SC.Gesture.CANCELLED;
      this.notifyViewOfGestureEvent(view,'panCancel');
    }
    else {
      manager.redispatchEventToView(view,'touchcancel', evt);
    }
  }
});

SC.Gestures.register('pan', SC.PanGestureRecognizer);
