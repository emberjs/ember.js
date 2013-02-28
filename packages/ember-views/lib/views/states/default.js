require('ember-views/views/view');

/**
@module ember
@submodule ember-views
*/

var get = Ember.get, set = Ember.set;

Ember.View.states._default = {
  // appendChild is only legal while rendering the buffer.
  appendChild: function() {
    throw "You can't use appendChild outside of the rendering process";
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
      Ember.run.cancel(view._scheduledInsert);
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
