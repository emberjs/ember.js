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

  startLocation: null,
  _moveThreshold: 10,

  touchStart: function(evt, view, manager) {
    var touches = evt.originalEvent.targetTouches,
        numberOfTouches = this.numberOfTouches;

    if (touches.length === numberOfTouches) {
      var touch = touches[0];

      this.startLocation = {pageX:touch.pageX,pageY:touch.pageY};
      this.state = SC.Gesture.POSSIBLE;
      this.notifyViewOfGestureEvent(view,'tapStart');
    }

    manager.redispatchEventToView(view,'touchstart');
  },

  touchEnd: function(evt, view, manager) {
    var touches = evt.originalEvent.changedTouches;

    if(touches.length !== get(this, 'numberOfTouches')) {
      manager.redispatchEventToView(view,'touchend');
      return;
    }

    var distance = this.distance(this.startLocation,touches[0]);

    if (this.state === SC.Gesture.POSSIBLE && distance <= this._moveThreshold) {
      this.state = SC.Gesture.ENDED;
      this.notifyViewOfGestureEvent(view,'tapEnd');
    }
    else {
      this.state = SC.Gesture.CANCELLED;
      this.notifyViewOfGestureEvent(view,'tapCancel');
    }

  },

  touchCancel: function(evt, view, manager) {
    manager.redispatchEventToView(view,'touchcancel');
  }
});

SC.Gestures.register('tap', SC.TapGestureRecognizer);
