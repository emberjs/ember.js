// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;

/** 
  @class
  
  Registry of known gestures in the system. This is a singleton class, and is
  used by SC.View to analyze instances of SC.View for gesture support.

  You will not use this class yourself. Rather, gesture recognizers will call
  SC.Gestures.register(name, recognizer) when they want to make the system aware
  of them.

  @private
  @extends SC.Object
*/
SC.Gestures = SC.Object.create({
/** @scope SC.Gestures.prototype */{
  
  _registeredGestures: null,

  init: function() {
    this._registeredGestures = {};

    return this._super();
  },

  /**
    Registers a gesture recognizer to the system. The gesture recognizer is 
    identified by the name parameter, which must be unique across the system.    
  */
  register: function(name, /** SC.Gesture */recognizer) {
    var registeredGestures = this._registeredGestures;

    if (registeredGestures[name] !== undefined) {
      throw new SC.Error(name+" already exists as a registered gesture recognizers. Gesture recognizers must have globally unique names.");
    }

    registeredGestures[name] = recognizer;
  },

  /**
    Registers a gesture recognizer to the system. The gesture recognizer is 
    identified by the name parameter, which must be unique across the system.    
  */
  knownGestures: function() {
    var registeredGestures = this._registeredGestures;

    return (registeredGestures)? registeredGestures : {};
  }

});

