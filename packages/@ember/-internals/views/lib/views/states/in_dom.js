import { assign } from '@ember/polyfills';
import hasElement from './has_element';

const inDOM = assign({}, hasElement, {
  enter(view) {
    // Register the view for event handling. This hash is used by
    // Ember.EventDispatcher to dispatch incoming events.
    view.renderer.register(view);
  },

  exit(view) {
    view.renderer.unregister(view);
  },
});

export default Object.freeze(inDOM);
