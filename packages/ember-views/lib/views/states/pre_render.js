// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-views/views/states/default');

Ember.View.states.preRender = {
  parentState: Ember.View.states._default,

  // a view leaves the preRender state once its element has been
  // created (createElement).
  insertElement: function(view, fn) {
    view.createElement();
    view._notifyWillInsertElement(true);
    // after createElement, the view will be in the hasElement state.
    fn.call(view);
    view.transitionTo('inDOM');
    view._notifyDidInsertElement();
  },

  // This exists for the removal warning, remove later
  $: function(view){
    if (view._willInsertElementAccessUnsupported) {
      console.error("Getting element from willInsertElement is unreliable and no longer supported.");
    }
    return Ember.$();
  },

  // This exists for the removal warning, remove later
  getElement: function(view){
    if (view._willInsertElementAccessUnsupported) {
      console.error("Getting element from willInsertElement is unreliable and no longer supported.");
    }
    return null;
  },

  setElement: function(view, value) {
    view.beginPropertyChanges();
    view.invalidateRecursively('element');

    if (value !== null) {
      view.transitionTo('hasElement');
    }

    view.endPropertyChanges();

    return value;
  }
};
