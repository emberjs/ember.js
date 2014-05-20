import Ember from "ember-metal/core"; // Ember.K
import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";
import run from "ember-metal/run_loop";
import EmberError from "ember-metal/error";

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
    set(view, 'element', null);
    if (view._scheduledInsert) {
      run.cancel(view._scheduledInsert);
      view._scheduledInsert = null;
    }
    return view;
  },

  renderToBufferIfNeeded: function () {
    return false;
  },

  rerender: Ember.K,
  invokeObserver: Ember.K
};
