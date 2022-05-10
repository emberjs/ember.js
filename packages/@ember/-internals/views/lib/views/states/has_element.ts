import _default from './default';
import { join } from '@ember/runloop';
import { flaggedInstrument } from '@ember/instrumentation';
import type Component from '@ember/component';
import type { ViewState } from '../states';

const hasElement: ViewState = {
  ..._default,

  rerender(view: Component) {
    view.renderer.rerender();
  },

  destroy(view: Component) {
    view.renderer.remove(view);
  },

  // Handle events from `Ember.EventDispatcher`
  handleEvent(view: Component, eventName: string, event: Event) {
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
};

export default Object.freeze(hasElement);
