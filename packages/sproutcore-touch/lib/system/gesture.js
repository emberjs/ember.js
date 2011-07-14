// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;

/** Base class for all gesture recognizers */
SC.Gesture = SC.Object.extend({
  isGesturable: true,
  name: null,
  state: null,

  distance: function(first, second) {

    var x = first.pageX;
    var y = first.pageY;
    var x0 = second.pageX;
    var y0 = second.pageY;

    return Math.sqrt((x -= x0) * x + (y -= y0) * y);
  },

  toString: function() {
    return SC.Gesture+'<'+SC.guidFor(this)+'>';
  },

  redispatchEventToView: function(view, eventName) {
    view.$().trigger(eventName,true);
  },

  notifyViewOfGestureEvent: function(view, eventName, data) {
    var handler = view[eventName];

    if (SC.typeOf(handler) === 'function') {
      handler.call(view, this, data);
    }
  }

});

SC.Gesture.WAITING_FOR_TOUCHES = 0;
SC.Gesture.POSSIBLE = 1;
SC.Gesture.BEGAN = 2;
SC.Gesture.CHANGED = 3;
SC.Gesture.ENDED = 4;
SC.Gesture.CANCELLED = 4;
