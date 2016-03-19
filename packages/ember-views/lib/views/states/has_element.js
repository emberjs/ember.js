import _default from 'ember-views/views/states/default';
import assign from 'ember-metal/assign';
import jQuery from 'ember-views/system/jquery';
import run from 'ember-metal/run_loop';
import { flaggedInstrument } from 'ember-metal/instrumentation';

/**
@module ember
@submodule ember-views
*/

import { get } from 'ember-metal/property_get';

var hasElement = Object.create(_default);

assign(hasElement, {
  $(view, sel) {
    var elem = view.element;
    return sel ? jQuery(sel, elem) : jQuery(elem);
  },

  getElement(view) {
    var parent = get(view, 'parentView');
    if (parent) { parent = get(parent, 'element'); }
    if (parent) { return view.findElementInParentElement(parent); }
    return jQuery('#' + get(view, 'elementId'))[0];
  },

  // once the view has been inserted into the DOM, rerendering is
  // deferred to allow bindings to synchronize.
  rerender(view) {
    view.renderer.ensureViewNotRendering(view);
    view.renderer.rerender(view);
  },

  cleanup(view) {
    view._currentState.destroyElement(view);
  },

  // once the view is already in the DOM, destroying it removes it
  // from the DOM, nukes its element, and puts it back into the
  // preRender state if inDOM.

  destroyElement(view) {
    view.renderer.remove(view, false);
    return view;
  },

  // Handle events from `Ember.EventDispatcher`
  handleEvent(view, eventName, event) {
    if (view.has(eventName)) {
      // Handler should be able to re-dispatch events, so we don't
      // preventDefault or stopPropagation.
      return flaggedInstrument(`interaction.${eventName}`, { event, view }, () => {
        return run.join(view, view.trigger, eventName, event);
      });
    } else {
      return true; // continue event propagation
    }
  },

  invokeObserver(target, observer) {
    observer.call(target);
  }
});

export default hasElement;
