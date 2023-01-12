import { teardownMandatorySetter } from '@ember/-internals/utils';
import type Component from '@ember/component';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import type { ViewState } from '../states';
import hasElement from './has_element';

const inDOM: ViewState = {
  ...hasElement,

  enter(view: Component) {
    // Register the view for event handling. This hash is used by
    // Ember.EventDispatcher to dispatch incoming events.
    view.renderer.register(view);

    if (DEBUG) {
      let elementId = view.elementId;

      assert(
        '[BUG] Expected teardownMandatorySetter to be set in DEBUG mode',
        teardownMandatorySetter
      );
      teardownMandatorySetter(view, 'elementId');

      Object.defineProperty(view, 'elementId', {
        configurable: true,
        enumerable: true,

        get() {
          return elementId;
        },
        set(value) {
          if (value !== elementId) {
            throw new Error("Changing a view's elementId after creation is not allowed");
          }
        },
      });
    }
  },
};

export default Object.freeze(inDOM);
