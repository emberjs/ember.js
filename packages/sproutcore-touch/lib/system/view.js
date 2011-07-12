// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get;
var set = SC.set;

SC.View.reopen(
/** @scope SC.View.prototype */{

  gestures: null,

  eventManager: null,

  init: function() {
    this._super();

    var knownGestures = SC.Gestures.knownGestures();

    if (knownGestures) {
      var gestures = [];
      
      for (var gesture in knownGestures) {
        if (this[gesture+'Start'] || this[gesture+'Change'] || this[gesture+'End']) {
          gestures.push(knownGestures[gesture].create({
            view: this
          }));
        }
      }

      var manager = SC.GestureManager.create({
        gestures: gestures
      });

      set(this, 'eventManager', manager);
      
    }
  }
  
});

