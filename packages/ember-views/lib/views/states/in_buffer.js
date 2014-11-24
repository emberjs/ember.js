import _default from "ember-views/views/states/default";
import EmberError from "ember-metal/error";

import jQuery from "ember-views/system/jquery";
import { create } from "ember-metal/platform";
import merge from "ember-metal/merge";

/**
@module ember
@submodule ember-views
*/

var inBuffer = create(_default);

merge(inBuffer, {
  $: function(view, sel) {
    // if we don't have an element yet, someone calling this.$() is
    // trying to update an element that isn't in the DOM. Instead,
    // rerender the view to allow the render method to reflect the
    // changes.
    view.rerender();
    return jQuery();
  },

  // when a view is rendered in a buffer, rerendering it simply
  // replaces the existing buffer with a new one
  rerender: function(view) {
    throw new EmberError("Something you did caused a view to re-render after it rendered but before it was inserted into the DOM.");
  },

  // when a view is rendered in a buffer, appending a child
  // view will render that view and append the resulting
  // buffer into its buffer.
  appendChild: function(view, childView, options) {
    var buffer = view.buffer;
    var _childViews = view._childViews;

    childView = view.createChildView(childView, options);
    if (!_childViews.length) { _childViews = view._childViews = _childViews.slice(); }
    _childViews.push(childView);

    if (!childView._morph) {
      buffer.pushChildView(childView);
    }

    view.propertyDidChange('childViews');

    return childView;
  },

  invokeObserver: function(target, observer) {
    observer.call(target);
  }
});

export default inBuffer;
