// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-views/views/view');

var get = Ember.get, set = Ember.set;

Ember.View.states = {
  _default: {
    // appendChild is only legal while rendering the buffer.
    appendChild: function() {
      throw "You can't use appendChild outside of the rendering process";
    },

    $: function() {
      return Ember.$();
    },

    getElement: function() {
      return null;
    },

    // Handle events from `Ember.EventDispatcher`
    handleEvent: function() {
      return true; // continue event propagation
    },

    destroyElement: function(view) {
      set(view, 'element', null);
      view._lastInsert = null;
      return view;
    }
  }
};

Ember.View.reopen({
  states: Ember.View.states
});
