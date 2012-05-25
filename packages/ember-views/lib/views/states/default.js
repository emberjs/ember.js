// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-views/views/view');

var get = Ember.get, set = Ember.set;
Ember.View.states = {};

/** @private */
Ember.View.states.DefaultState = Ember.State.extend({
  handleEvent: function() {
    return true; // continue event propagation
  },
  appendChild: function() {
    throw "You can't use appendChild outside of the rendering process";
  },
  destroyElement: function(manager) {
    var view = get(manager, 'view');
    set(view, 'element', null);
    view._lastInsert = null;
    return view;
  },
  getElement: function(){
    return null;
  },
  childViewsDidChange: Ember.K,
  insertElement: Ember.K,
  
  // default behavior is to complain of missing actions:
  rerender: Ember.K,
  childViewsWillChange: Ember.K,
  $: function(){
    return Ember.$();
  }
});
