import { subscribe, unsubscribe } from '@ember/instrumentation';
import type { InstrumentationCallbacks } from '../types';

export const instrumentation = {
  /**
   * Subscribe to an Ember instrumentation event.
   *
   * @param eventName - Namespaced event name (e.g. "render", "render.component")
   * @param callbacks - Before and after hooks
   * @returns A subscriber token that can be passed to unsubscribe
   */
  subscribe<T>(
    eventName: string,
    callbacks: InstrumentationCallbacks<T>
  ): { pattern: string; regex: RegExp; object: InstrumentationCallbacks<T> } {
    return subscribe(eventName, {
      before: callbacks.before ?? (() => undefined as unknown as T),
      after: callbacks.after ?? (() => {}),
    }) as { pattern: string; regex: RegExp; object: InstrumentationCallbacks<T> };
  },

  /**
   * Unsubscribe from an instrumentation event.
   *
   * @param subscriber - The subscriber token returned by subscribe
   */
  unsubscribe(subscriber: {
    pattern: string;
    regex: RegExp;
    object: InstrumentationCallbacks;
  }): void {
    unsubscribe(subscriber as any);
  },
};
