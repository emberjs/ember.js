import { teardownMandatorySetter } from '@ember/-internals/utils';
import { assign } from '@ember/polyfills';
import EmberError from '@ember/error';
import { DEBUG } from '@glimmer/env';
import hasElement from './has_element';
import { registerView } from '@ember/-internals/views';

const inDOM = assign({}, hasElement, {
  enter(view) {
    registerView(view);

    if (DEBUG) {
      let elementId = view.elementId;

      teardownMandatorySetter(view, 'elementId');

      Object.defineProperty(view, 'elementId', {
        configurable: true,
        enumerable: true,

        get() {
          return elementId;
        },
        set(value) {
          if (value !== elementId) {
            throw new EmberError("Changing a view's elementId after creation is not allowed");
          }
        },
      });
    }
  },
});

export default Object.freeze(inDOM);
