// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-views/views/view');

var get = SC.get, set = SC.set;

SC.View.states = {
  "default": {
    // appendChild is only legal while rendering the buffer.
    appendChild: function() {
      throw "You can't use appendChild outside of the rendering process";
    },

    $: function() {
      return SC.$();
    },

    getElement: function() {
      return null;
    },

    setElement: function(value) {
      if (value) {
        view.clearBuffer();
        view.transitionTo('inDOM');
      } else {
        throw "You can't set an element to null when the view has not yet been inserted into the DOM";
      }

      return value;
    }
  }
};

SC.View.reopen({
  states: SC.View.states
});
