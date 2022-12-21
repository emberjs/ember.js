import { teardownMandatorySetter } from '@ember/-internals/utils';
import type Component from '@ember/component';
import { assert } from '@ember/debug';
import { flaggedInstrument } from '@ember/instrumentation';
import { join } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';

export interface ViewState {
  enter?(view: Component): void;
  exit?(view: Component): void;
  appendChild(): void;
  handleEvent(view: Component, eventName: string, event: Event): boolean;
  rerender(view: Component): void;
  destroy(view: Component): void;
}

const DEFAULT: Readonly<ViewState> = Object.freeze({
  // appendChild is only legal while rendering the buffer.
  appendChild() {
    throw new Error("You can't use appendChild outside of the rendering process");
  },

  // Handle events from `Ember.EventDispatcher`
  handleEvent() {
    return true; // continue event propagation
  },

  rerender() {},

  destroy() {},
});

const PRE_RENDER: Readonly<ViewState> = Object.freeze({ ...DEFAULT });

const HAS_ELEMENT: Readonly<ViewState> = Object.freeze({
  ...DEFAULT,

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
});

const IN_DOM: Readonly<ViewState> = Object.freeze({
  ...HAS_ELEMENT,

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
});

const DESTROYING: Readonly<ViewState> = Object.freeze({
  ...DEFAULT,

  appendChild() {
    throw new Error("You can't call appendChild on a view being destroyed");
  },

  rerender() {
    throw new Error("You can't call rerender on a view being destroyed");
  },
});

/*
  Describe how the specified actions should behave in the various
  states that a view can exist in. Possible states:

  * preRender: when a view is first instantiated, and after its
    element was destroyed, it is in the preRender state
  * hasElement: the DOM representation of the view is created,
    and is ready to be inserted
  * inDOM: once a view has been inserted into the DOM it is in
    the inDOM state. A view spends the vast majority of its
    existence in this state.
  * destroyed: once a view has been destroyed (using the destroy
    method), it is in this state. No further actions can be invoked
    on a destroyed view.
*/
const states = Object.freeze({
  preRender: PRE_RENDER,
  inDOM: IN_DOM,
  hasElement: HAS_ELEMENT,
  destroying: DESTROYING,
});

export default states;
