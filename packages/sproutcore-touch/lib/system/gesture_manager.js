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

  _redispatchQueue: null,

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

    this._redispatchQueue = {};
        
    for (var i=0, l=gestures.length; i < l; i++) {
      gesture = gestures[i];
      handler = gesture[eventName];

      if (SC.typeOf(handler) === 'function') {
        handler.call(gesture, eventObject, view, this);
      }
    };

    this._performReDispatching();
  },

  redispatchEventToView: function(view, eventName) {
    var queue = this._redispatchQueue;

    if (queue[eventName] === undefined) {
      queue[eventName] = [];
    }
    else {
      var views = queue[eventName];
      for (var i=0, l=views.length; i<l; i++) {
        if (view === views[i]) {
          return;
        }
      }
    }

    queue[eventName].push(view);
  },

  _performReDispatching: function() {
    var queue = this._redispatchQueue;

    for (var eventName in queue) {
      var views = queue[eventName];

      for (var i=0, l=views.length; i<l; i++) {
        var view = views[i];
        view.$().trigger(eventName,true);
      }
    }
  }

});
