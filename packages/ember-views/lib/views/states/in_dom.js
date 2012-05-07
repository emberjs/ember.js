// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-views/views/states/default');

var get = Ember.get, set = Ember.set, meta = Ember.meta;

Ember.View.states.hasElement = {
  parentState: Ember.View.states._default,

  $: function(view, sel) {
    var elem = get(view, 'element');
    return sel ? Ember.$(sel, elem) : Ember.$(elem);
  },

  getElement: function(view) {
    var parent = get(view, 'parentView');
    if (parent) { parent = get(parent, 'element'); }
    if (parent) { return view.findElementInParentElement(parent); }
    return Ember.$("#" + get(view, 'elementId'))[0];
  },

  setElement: function(view, value) {
    if (value === null) {
      view.invalidateRecursively('element');

      view.transitionTo('preRender');
    } else {
      throw "You cannot set an element to a non-null value when the element is already in the DOM.";
    }

    return value;
  },

  // once the view has been inserted into the DOM, rerendering is
  // deferred to allow bindings to synchronize.
  rerender: function(view) {
    view._notifyWillRerender();

    view.clearRenderedChildren();

    view.domManager.replace(view);
    return view;
  },

  // once the view is already in the DOM, destroying it removes it
  // from the DOM, nukes its element, and puts it back into the
  // preRender state if inDOM.

  destroyElement: function(view) {
    view._notifyWillDestroyElement();
    view.domManager.remove(view);
    return view;
  },

  empty: function(view) {
    var _childViews = get(view, '_childViews'), len, idx;
    if (_childViews) {
      len = get(_childViews, 'length');
      for (idx = 0; idx < len; idx++) {
        _childViews[idx]._notifyWillDestroyElement();
      }
    }
    view.domManager.empty(view);
  },

  // Handle events from `Ember.EventDispatcher`
  handleEvent: function(view, eventName, evt) {
    var handler = view[eventName];
    if (Ember.typeOf(handler) === 'function') {
      return handler.call(view, evt);
    } else {
      return true; // continue event propagation
    }
  }
};

Ember.View.states.inDOM = {
  parentState: Ember.View.states.hasElement,

  insertElement: function(view, fn) {
    if (view._lastInsert !== Ember.guidFor(fn)){
      return;
    }
    throw "You can't insert an element into the DOM that has already been inserted";
  }
};
