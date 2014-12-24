import EmberError from "ember-metal/error";

function K() { return this; }

/**
@module ember
@submodule ember-views
*/
export default {
  // appendChild is only legal while rendering the buffer.
  appendChild: function() {
    throw new EmberError("You can't use appendChild outside of the rendering process");
  },

  $: function() {
    return undefined;
  },

  getElement: function() {
    return null;
  },

  // Handle events from `Ember.EventDispatcher`
  handleEvent: function() {
    return true; // continue event propagation
  },

  destroyElement: function(view) {
    if (view._renderer) {
      view._renderer.remove(view, false);
    }

    return view;
  },

  rerender: K,
  invokeObserver: K
};
