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
  },

  knownGestures: function() {
    var registeredGestures = this._registeredGestures;

    return (registeredGestures)? registeredGestures : {};
  }

});

