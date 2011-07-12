// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;

/** Registry of known gestures */
SC.Gestures = SC.Object.create({
  
  _registeredGestures: null,

  init: function() {
    this._registeredGestures = {};

    return this._super();
  },

  register: function(name, recognizer) {
    var registeredGestures = this._registeredGestures;

    if (registeredGestures[name] !== undefined) {
      throw new SC.Error(name+" already exists as a registered gesture recognizers. Gesture recognizers must have globally unique names.");
    }

    registeredGestures[name] = recognizer;
    
    this._attachListeners(recognizer, name);
  },

  knownGestures: function() {
    var registeredGestures = this._registeredGestures;

    return (registeredGestures)? registeredGestures : {};
  },

  _attachListeners: function(recognizer, name) {
    var events = ['start','move','end','cancel'];

    for (var i=0, l=events.length; i<l; i++) {
      var event = events[i];
      this._setupHandler(recognizer, name, event);
    }
  },

  _setupHandler: function(recognizer, name, event) {
    var that = this;

    $(document.body).delegate("."+name, "touch"+event, function(e){
      console.log('hever');
      that.eventFired(recognizer,eventName,e);
    })
  },

  eventFired: function(recognizer, eventName, evt) {
    console.log('Event',eventName,'fired on recognizer',recognizer);
  }

});

