import { addListener, removeListener, hasListeners, sendEvent } from '@ember/-internals/metal';
import { deprecate } from '@ember/debug';
import Mixin from '@ember/object/mixin';

export { on } from '@ember/-internals/metal';

/**
  @module @ember/-internals/runtime
*/

/**
  Internal implementation of the Evented mixin.
  This mixin allows for Ember objects to subscribe to and emit events.

  @private
  @deprecated
 */
interface Evented {
  /** @deprecated */
  on<Target>(
    name: string,
    target: Target,
    method: string | ((this: Target, ...args: any[]) => void)
  ): this;
  on(name: string, method: ((...args: any[]) => void) | string): this;

  /** @deprecated */
  one<Target>(
    name: string,
    target: Target,
    method: string | ((this: Target, ...args: any[]) => void)
  ): this;
  one(name: string, method: string | ((...args: any[]) => void)): this;

  /** @deprecated */
  trigger(name: string, ...args: any[]): any;

  /** @deprecated */
  off<Target>(
    name: string,
    target: Target,
    method: string | ((this: Target, ...args: any[]) => void)
  ): this;
  off(name: string, method: string | ((...args: any[]) => void)): this;

  /** @deprecated */
  has(name: string): boolean;
}

const Evented = Mixin.create({
  on(name: string, target: object, method?: string | Function) {
    deprecate(
      '`on` is deprecated. Use native JavaScript events or a dedicated event library instead.',
      false,
      {
        for: 'ember-source',
        id: 'ember-evented',
        since: { available: '6.8.0' },
        until: '7.0.0',
      }
    );
    // SAFETY: The types are not actaully correct, but it's not worth the effort to fix them, since we'll be deprecating this API soon.
    addListener(this, name, target, method as any);
    return this;
  },

  one(name: string, target: object, method?: string | Function) {
    deprecate(
      '`one` is deprecated. Use native JavaScript events or a dedicated event library instead.',
      false,
      {
        for: 'ember-source',
        id: 'ember-evented',
        since: { available: '6.8.0' },
        until: '7.0.0',
      }
    );
    // SAFETY: The types are not actaully correct, but it's not worth the effort to fix them, since we'll be deprecating this API soon.
    addListener(this, name, target, method as any, true);
    return this;
  },

  trigger(name: string, ...args: any[]) {
    deprecate(
      '`trigger` is deprecated. Use native JavaScript events or a dedicated event library instead.',
      false,
      {
        for: 'ember-source',
        id: 'ember-evented',
        since: { available: '6.8.0' },
        until: '7.0.0',
      }
    );
    sendEvent(this, name, args);
  },

  off(name: string, target: object, method?: string | Function) {
    deprecate(
      '`off` is deprecated. Use native JavaScript events or a dedicated event library instead.',
      false,
      {
        for: 'ember-source',
        id: 'ember-evented',
        since: { available: '6.8.0' },
        until: '7.0.0',
      }
    );
    removeListener(this, name, target, method);
    return this;
  },

  has(name: string) {
    deprecate(
      '`has` is deprecated. Use native JavaScript events or a dedicated event library instead.',
      false,
      {
        for: 'ember-source',
        id: 'ember-evented',
        since: { available: '6.8.0' },
        until: '7.0.0',
      }
    );
    return hasListeners(this, name);
  },
});

export default Evented;
