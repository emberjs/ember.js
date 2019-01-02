import EmberError from '@ember/error';

const _default = {
  // appendChild is only legal while rendering the buffer.
  appendChild() {
    throw new EmberError("You can't use appendChild outside of the rendering process");
  },

  // Handle events from `Ember.EventDispatcher`
  handleEvent() {
    return true; // continue event propagation
  },

  rerender() {},

  destroy() {},
};

export default Object.freeze(_default);
