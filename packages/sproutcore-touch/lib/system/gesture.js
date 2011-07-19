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
  
  Base class for all gesture recognizers. Provides some utility methods and
  some required methods all gesture recognizers are expected to implement.

  Overview
  =========

  Gestures coalesce multiple touch events to a single higher-level gesture 
  event. For example, a tap gesture recognizer takes information about a 
  touchstart event, a few touchmove events, and a touchend event and uses
  some heuristics to decide whether or not that sequence of events qualifies
  as an event. If it does, then it will notify the view of the higher-level
  tap events.

  Gesture events follow the format: 
  
    * [GESTURE_NAME]Start - Sent when a gesture has gathered enough information
        to begin tracking the gesture

    * [GESTURE_NAME]Change - Sent when a gesture has already started and has
        received touchmove events that cause its state to change

    * [GESTURE_NAME]End - Sent when a touchend event is received and the gesture
        recognizer decides that the gesture is finished.

    * [GESTURE_NAME]Cancel - Sent when a touchcancel event is received.

  There are two types of gesturess: Discrete and Continuous gestures. In contrast
  to continuous gestures, discrete gestures don't have any change events. Rather,
  the start and end events are the only one that gets sent.

  Usage
  =======

  While you wouldn't use SC.Gesture directly, all its subclasses have the same
  API. For example, to implement pinch on a view, you implement pinchChange and
  optionally pinchStart and pinchEnd.

    var myView = SC.View.create({
      pinchStart: function(recognizer) {
        this.$().css('background','red');
      },
      
      pinchChange: function(recognizer, scale) {
        this.$().css('-webkit-transform','scale3d('+scale+','+scale+',1)');
      },

      pinchEnd: function(recognizer) {
        this.$().css('background','blue');
      },

      pinchCancel: function(recognizer) {
        this.$().css('background','blue');
      }
    });

  pinchStart(), pinchEnd() and pinchCancel() will only get called once per
  gesture, but pinchChange() will get called repeatedly called every time
  one of the touches moves.

  @extends SC.Object
*/
SC.Gesture = SC.Object.extend(
  /** @scope SC.Gesture.prototype */{
  
  /**
    The current state of the gesture recognizer. This value can be any one
    of the states defined at the end of this file.    
  
    @type Number
  */
  state: null,

  /**
    Given two Touch objects, this method returns the distance between them.    
  
    @return Number
  */
  distance: function(touches) {

    if (touches.length !== 2) {
      throw new SC.Error('trying to get the distance between more than two points is not defined. Touches length: '+touches.length);
    }

    var first = touches[0];
    var second = touches[1];
    var x = first.pageX;
    var y = first.pageY;
    var x0 = second.pageX;
    var y0 = second.pageY;

    return Math.sqrt((x -= x0) * x + (y -= y0) * y);
  },

  /**
    Given two Touch objects, this method returns the midpoint between them.    
  
    @return Number
  */
  centerPointForTouches: function(first, second) {
    var location = {x: null, y: null};

    location.x = Math.round(((first.pageX + second.pageX) / 2)*sigFigs)/sigFigs;
    location.y = Math.round(((first.pageY + second.pageY) / 2)*sigFigs)/sigFigs;

    return location;
  },

  /**
    Allows the gesture to notify the view it's associated with of a gesture
    event.
  */
  notifyViewOfGestureEvent: function(view, eventName, data) {
    var handler = view[eventName];

    if (SC.typeOf(handler) === 'function') {
      handler.call(view, this, data);
    }
  },

  toString: function() {
    return SC.Gesture+'<'+SC.guidFor(this)+'>';
  }

});

SC.Gesture.WAITING_FOR_TOUCHES = 0;
SC.Gesture.POSSIBLE = 1;
SC.Gesture.BEGAN = 2;
SC.Gesture.CHANGED = 3;
SC.Gesture.ENDED = 4;
SC.Gesture.CANCELLED = 4;
