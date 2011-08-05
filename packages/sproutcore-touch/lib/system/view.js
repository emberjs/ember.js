// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;

/** 
  @class
  
  Extends SC.View by making the init method gesture-aware.

  @extends SC.Object
*/
SC.View.reopen(
/** @scope SC.View.prototype */{

  /**
    The SC.GestureManager instance which will manager the gestures of the view.    
    This object is automatically created and set at init-time.

    @default null
    @type Array
  */
  eventManager: null,

  /**
    Inspects the properties on the view instance and create gestures if they're 
    used.
  */
  init: function() {
    this._super();

    var knownGestures = SC.Gestures.knownGestures();
    var eventManager = get(this, 'eventManager');

    if (knownGestures && !eventManager) {
      var gestures = [];

      for (var gesture in knownGestures) {
        if (this[gesture+'Start'] || this[gesture+'Change'] || this[gesture+'End']) {

          var optionsHash;
          if (this[gesture+'Options'] !== undefined && typeof this[gesture+'Options'] === 'object') {
            optionsHash = this[gesture+'Options'];
          } else {
            optionsHash = {};
          }

          optionsHash.name = gesture;
          optionsHash.view = this;

          gestures.push(knownGestures[gesture].create(optionsHash));
        }
      }

      var manager = SC.GestureManager.create({
        gestures: gestures
      });

      set(this, 'eventManager', manager);
 
    }
  }

});

