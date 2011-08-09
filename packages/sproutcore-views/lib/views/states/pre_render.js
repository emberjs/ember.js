// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-views/views/states/default');

SC.View.states.preRender = {
  // a view leaves the preRender state once its element has been
  // created (createElement).
  insertElement: function(view, fn) {
    // If we don't have an element, guarantee that it exists before
    // invoking the willInsertElement event.
    view.createElement();

    view._notifyWillInsertElement();
    fn.call(view);
    view._notifyDidInsertElement();
  },

  setElement: function(view, value) {
    view.beginPropertyChanges();
    view.invalidateRecursively('element');

    if (value !== null) {
      view.transitionTo('inDOM');
    }

    view.endPropertyChanges();

    return value;
  }
}
