require('ember-views/views/states/default');

/**
@module ember
@submodule ember-views
*/

var destroyedError = "You can't call %@ on a destroyed view", fmt = Ember.String.fmt;

Ember.View.states.destroyed = {
  parentState: Ember.View.states._default,

  appendChild: function() {
    throw fmt(destroyedError, ['appendChild']);
  },
  rerender: function() {
    throw fmt(destroyedError, ['rerender']);
  },
  destroyElement: function() {
    throw fmt(destroyedError, ['destroyElement']);
  },
  empty: function() {
    throw fmt(destroyedError, ['empty']);
  },

  setElement: function() {
    throw fmt(destroyedError, ["set('element', ...)"]);
  },

  renderToBufferIfNeeded: function() {
    throw fmt(destroyedError, ["renderToBufferIfNeeded"]);
  },

  // Since element insertion is scheduled, don't do anything if
  // the view has been destroyed between scheduling and execution
  insertElement: Ember.K
};

