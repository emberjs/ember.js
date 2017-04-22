import {
  EmberError
} from 'ember-debug';

/**
@module ember
@submodule ember-views
*/
export default {
  // appendChild is only legal while rendering the buffer.
  appendChild() {
    throw new EmberError('You can\'t use appendChild outside of the rendering process');
  },

  // Handle events from `Ember.EventDispatcher`
  handleEvent() {
    return true; // continue event propagation
  },

  rerender() { },

  destroy() { }
};
