import { teardownMandatorySetter } from '@ember/-internals/utils';
import { assign } from '@ember/polyfills';
import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import EmberError from '@ember/error';
import { DEBUG } from '@glimmer/env';
import hasElement from './has_element';

const inDOM = assign({}, hasElement, {
  enter(view) {
    // Register the view for event handling. This hash is used by
    // Ember.EventDispatcher to dispatch incoming events.
    view.renderer.register(view);

    if (DEBUG) {
      let elementId = view.elementId;

      if (EMBER_METAL_TRACKED_PROPERTIES) {
        teardownMandatorySetter(view, 'elementId');
      }

      Object.defineProperty(view, 'elementId', {
        configurable: true,
        enumerable: true,

        get() {
          return elementId;
        },
        set() {
          throw new EmberError("Changing a view's elementId after creation is not allowed");
        },
      });
    }
  },

  exit(view) {
    view.renderer.unregister(view);
  },
});

export default Object.freeze(inDOM);
