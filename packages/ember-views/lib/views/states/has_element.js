import { assign } from 'ember-utils';
import _default from './default';
import { run, flaggedInstrument } from 'ember-metal';

const hasElement = Object.create(_default);

assign(hasElement, {

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
        return run.join(view, view.trigger, eventName, event);
      });
    } else {
      return true; // continue event propagation
    }
  }
});

export default hasElement;
