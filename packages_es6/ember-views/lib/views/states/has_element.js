import _default from "ember-views/views/states/default";
import run from "ember-metal/run_loop";
import merge from "ember-metal/merge";
import {create} from "ember-metal/platform";
import jQuery from "ember-views/system/jquery";

/**
@module ember
@submodule ember-views
*/

import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";

var hasElement = create(_default);

merge(hasElement, {
  $: function(view, sel) {
    var elem = get(view, 'element');
    return sel ? jQuery(sel, elem) : jQuery(elem);
  },

  getElement: function(view) {
    var parent = get(view, 'parentView');
    if (parent) { parent = get(parent, 'element'); }
    if (parent) { return view.findElementInParentElement(parent); }
    return jQuery("#" + get(view, 'elementId'))[0];
  },

  setElement: function(view, value) {
    if (value === null) {
      view.transitionTo('preRender');
    } else {
      throw "You cannot set an element to a non-null value when the element is already in the DOM.";
    }

    return value;
  },

  // once the view has been inserted into the DOM, rerendering is
  // deferred to allow bindings to synchronize.
  rerender: function(view) {
    view.triggerRecursively('willClearRender');

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
    set(view, 'element', null);
    if (view._scheduledInsert) {
      run.cancel(view._scheduledInsert);
      view._scheduledInsert = null;
    }
    return view;
  },

  empty: function(view) {
    var _childViews = view._childViews, len, idx;
    if (_childViews) {
      len = _childViews.length;
      for (idx = 0; idx < len; idx++) {
        _childViews[idx]._notifyWillDestroyElement();
      }
    }
    view.domManager.empty(view);
  },

  // Handle events from `Ember.EventDispatcher`
  handleEvent: function(view, eventName, evt) {
    if (view.has(eventName)) {
      // Handler should be able to re-dispatch events, so we don't
      // preventDefault or stopPropagation.
      return view.trigger(eventName, evt);
    } else {
      return true; // continue event propagation
    }
  },

  invokeObserver: function(target, observer) {
    observer.call(target);
  }
});

export default hasElement;
