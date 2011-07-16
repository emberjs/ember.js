// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;

/** 
  @class
  
  Base class for all gesture recognizers. Provides some utility methods and
  some required methods all gesture recognizers are expected to implement.

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
  distance: function(first, second) {

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
