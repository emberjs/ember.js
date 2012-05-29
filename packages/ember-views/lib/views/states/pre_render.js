// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = Ember.get;

/** @private */
Ember.View.states.PreRenderState = Ember.State.extend({
  // a view leaves the preRender state once its element has been
  // created (createElement).
  insertElement: function(manager, fn) {
    var view = get(manager, 'view');
    
    if (view._lastInsert !== Ember.guidFor(fn)){
      return;
    }
    view.createElement();
    view._notifyWillInsertElement();
    // after createElement, the view will be in the hasElement state.
    fn.call(view);
    view.transitionTo('inDOM');
    view._notifyDidInsertElement();
  },

  empty: Ember.K,

  setElement: function(manager, value) {
    var view = get(manager, 'view');

    view.beginPropertyChanges();
    view.invalidateRecursively('element');

    if (value !== null) {
      view.transitionTo('hasElement');
    }

    view.endPropertyChanges();

    return value;
  }
});
