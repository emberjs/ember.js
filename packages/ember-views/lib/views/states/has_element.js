import _default from "ember-views/views/states/default";
import run from "ember-metal/run_loop";
import merge from "ember-metal/merge";
import create from 'ember-metal/platform/create';
import jQuery from "ember-views/system/jquery";
import EmberError from "ember-metal/error";

/**
@module ember
@submodule ember-views
*/

import { get } from "ember-metal/property_get";

var hasElement = create(_default);

merge(hasElement, {
  $(view, sel) {
    var elem = view.get('concreteView').element;
    return sel ? jQuery(sel, elem) : jQuery(elem);
  },

  getElement(view) {
    var parent = get(view, 'parentView');
    if (parent) { parent = get(parent, 'element'); }
    if (parent) { return view.findElementInParentElement(parent); }
    return jQuery("#" + get(view, 'elementId'))[0];
  },

  // once the view has been inserted into the DOM, rerendering is
  // deferred to allow bindings to synchronize.
  rerender(view) {
    if (view._root._morph && !view._elementInserted) {
      throw new EmberError('Something you did caused a view to re-render after it rendered but before it was inserted into the DOM.');
    }

    run.scheduleOnce('render', view, '_rerender');
  },

  // once the view is already in the DOM, destroying it removes it
  // from the DOM, nukes its element, and puts it back into the
  // preRender state if inDOM.

  destroyElement(view) {
    view._renderer.remove(view, false);
    return view;
  },

  // Handle events from `Ember.EventDispatcher`
  handleEvent(view, eventName, evt) {
    if (view.has(eventName)) {
      // Handler should be able to re-dispatch events, so we don't
      // preventDefault or stopPropagation.
      return view.trigger(eventName, evt);
    } else {
      return true; // continue event propagation
    }
  },

  invokeObserver(target, observer) {
    observer.call(target);
  }
});

export default hasElement;
