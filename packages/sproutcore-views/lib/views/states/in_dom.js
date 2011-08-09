// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-views/views/states/default');

var get = SC.get, set = SC.set, meta = SC.meta;

SC.View.states.inDOM = {

  $: function(view, sel) {
    var elem = get(view, 'element');
    return sel ? SC.$(sel, elem) : SC.$(elem);
  },

  getElement: function(view) {
    var parent = get(view, 'parentView');
    if (parent) { parent = get(parent, 'element'); }
    if (parent) { return ret = view.findElementInParentElement(parent); }
  },

  setElement: function(view, value) {

    if (value === null) {
      view.invalidateRecursively('element');
      view.transitionTo('preRender');
    } else {
      throw "You cannot set an element to a non-null value when the element is already in the DOM."
    }

    return value;
  },

  // once the view has been inserted into the DOM, rerendering is
  // deferred to allow bindings to synchronize.
  rerender: function(view) {
    var element = get(view, 'element');

    view.clearRenderedChildren();
    set(view, 'element', null);

    view._insertElementLater(function() {
      SC.$(element).replaceWith(get(view, 'element'));
    });
  },

  // once the view is already in the DOM, destroying it removes it
  // from the DOM, nukes its element, and puts it back into the
  // preRender state.
  destroyElement: function(view) {
    var elem = get(this, 'element');

    view.invokeRecursively(function(view) {
      this.willDestroyElement();
    });

    set(view, 'element', null);

    SC.$(elem).remove();
    return view;
  },

  // You shouldn't insert an element into the DOM that was already
  // inserted into the DOM.
  insertElement: function() {
    throw "You can't insert an element into the DOM that has already been inserted";
  }
};
