import { assign } from '@ember/polyfills';
import _default from './default';
import { join } from '@ember/runloop';
import { flaggedInstrument } from '@ember/instrumentation';

const hasElement = assign({}, _default, {
  rerender(view) {
    view.renderer.rerender(view);
  },

  destroy(view) {
    view.renderer.remove(view);
  },

  // Handle events from `Ember.EventDispatcher`
  handleEvent(view, eventName, event) {
    if (view.has(eventName)) {
      // Handler should be able to re-dispatch events, so we don't
      // preventDefault or stopPropagation.
      return flaggedInstrument(`interaction.${eventName}`, { event, view }, () => {
        return join(view, view.trigger, eventName, event);
      });
    } else {
      return true; // continue event propagation
    }
  },
});

export default Object.freeze(hasElement);
