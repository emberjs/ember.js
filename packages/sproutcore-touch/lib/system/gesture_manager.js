// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;

/** 
  @class

  Manages multiplegesture recognizers that are associated with a view.
  This class is instantiated automatically by SC.View and you wouldn't
  interact with it yourself.

  SC.GestureManager mainly acts as a composite for the multiple gesture
  recognizers associated with a view. Whenever it gets a touch event, it
  relays it to the gestures. The other main resposibility of 
  SC.GestureManager is to handle re-dispatching of events to the view.

  @extends SC.Object
*/
SC.GestureManager = SC.Object.extend({

  /**
    An array containing all the gesture recognizers associated with a
    view. This is set automatically by SC.View.    
  
    @default null
    @type Array
  */
  gestures: null,

  /**
    Internal hash used to keep a list of the events that need to be
    re-dispatched to the views. It's used so we don't re-dispatch
    the same event multiple times to the same view.    
  
    @default null
    @type Array
  */
  _redispatchQueue: null,

  /**
    Relays touchStart events to all the gesture recognizers to the 
    specified view
  
    @return Boolen
  */
  touchStart: function(evt, view) {
    return this._invokeEvent('touchStart',evt, view);
  },

  /**
    Relays touchMove events to all the gesture recognizers to the 
    specified view
  
    @return Boolen
  */
  touchMove: function(evt, view) {
    return this._invokeEvent('touchMove',evt, view);
  },

  /**
    Relays touchEnd events to all the gesture recognizers to the 
    specified view
  
    @return Boolen
  */
  touchEnd: function(evt, view) {
    return this._invokeEvent('touchEnd',evt, view);
  },

  /**
    Relays touchCancel events to all the gesture recognizers to the 
    specified view
  
    @return Boolen
  */
  touchCancel: function(evt, view) {
    return this._invokeEvent('touchCancelEnd',evt, view);
  },

  /**
    Relays an event to the gesture recognizers. Used internally
    by the touch event listeners.    
  
    @private
    @return Boolean
  */
  _invokeEvent: function(eventName, eventObject, view) {
    var gestures = get(this, 'gestures'),
        gesture, result = true;
        
    for (var i=0, l=gestures.length; i < l; i++) {
      gesture = gestures[i];
      handler = gesture[eventName];

      if (SC.typeOf(handler) === 'function') {
        result = handler.call(gesture, eventObject, view, this);
      }
    };

    this._redispatchIfNecessary();

    return result;
  },

  /**
    Similar to _invokeEvent, but instead of invoking the event
    to the gesture recognizers, it re-dispatches the event to the 
    view. This method is used by the gesture recognizers when they
    want to let the view respond to the original events.
  */
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

  /**
    This method is used internally by _invokeEvent. It re-dispatches
    events to the view if the gestures decided they want to.
  */
  _redispatchIfNecessary: function() {
    var queue = this._redispatchQueue;

    for (var eventName in queue) {
      var views = queue[eventName];

      for (var i=0, l=views.length; i<l; i++) {
        var view = views[i];
        view.$().trigger(eventName,true);
      }
    }

    this._redispatchQueue = {};
  }

});
