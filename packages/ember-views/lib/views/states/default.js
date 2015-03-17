import EmberError from "ember-metal/error";

function K() { return this; }

/**
@module ember
@submodule ember-views
*/
export default {
  // appendChild is only legal while rendering the buffer.
  appendChild() {
    throw new EmberError("You can't use appendChild outside of the rendering process");
  },

  $() {
    return undefined;
  },

  getElement() {
    return null;
  },

  // Handle events from `Ember.EventDispatcher`
  handleEvent() {
    return true; // continue event propagation
  },

  destroyElement(view) {
    if (view.renderer) {
      view.renderer.remove(view, false);
    }

    return view;
  },

  rerender: K,
  invokeObserver: K
};
