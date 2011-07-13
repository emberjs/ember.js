// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;

/** Manages instances of gesture recognizers associated with a view instance */
SC.GestureManager = SC.Object.extend({

  gestures: null,

  touchStart: function(evt, view) {
    this._invokeEvent('touchStart',evt, view);
  },

  touchMove: function(evt, view) {
    this._invokeEvent('touchMove',evt, view);
  },

  touchEnd: function(evt, view) {
    this._invokeEvent('touchEnd',evt, view);
  },

  _invokeEvent: function(eventName, eventObject, view) {
    var gestures = get(this, 'gestures'),
        gesture;

    //console.log('IN MANAGER, DISPATCHING '+eventName+' TO '+gestures.length+' GRs');
    //if (window.foo) debugger
    for (var i=0, l=gestures.length; i < l; i++) {
      gesture = gestures[i];
      handler = gesture[eventName];

      if (SC.typeOf(handler) === 'function') {
        handler.call(gesture, eventObject, view);
      }
    };
  }

});
