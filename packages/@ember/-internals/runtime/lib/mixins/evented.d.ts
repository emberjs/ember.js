import { Mixin } from '@ember/-internals/metal';

/**
 * This mixin allows for Ember objects to subscribe to and emit events.
 */
interface Evented {
  /**
   * Subscribes to a named event with given function.
   */
  on<Target>(
    name: string,
    target: Target,
    method: string | ((this: Target, ...args: any[]) => void)
  ): this;
  on(name: string, method: ((...args: any[]) => void) | string): this;
  // Allow for easier super calls
  on<Target>(
    name: string,
    ...args:
      | [Target, string | ((this: Target, ...args: any[]) => void)]
      | [((...args: any[]) => void) | string]
  ): this;
  /**
   * Subscribes a function to a named event and then cancels the subscription
   * after the first time the event is triggered. It is good to use ``one`` when
   * you only care about the first time an event has taken place.
   */
  one<Target>(
    name: string,
    target: Target,
    method: string | ((this: Target, ...args: any[]) => void)
  ): this;
  one(name: string, method: string | ((...args: any[]) => void)): this;
  /**
   * Triggers a named event for the object. Any additional arguments
   * will be passed as parameters to the functions that are subscribed to the
   * event.
   */
  trigger(name: string, ...args: any[]): any;
  /**
   * Cancels subscription for given name, target, and method.
   */
  off<Target>(
    name: string,
    target: Target,
    method: string | ((this: Target, ...args: any[]) => void)
  ): this;
  off(name: string, method: string | ((...args: any[]) => void)): this;
  /**
   * Checks to see if object has any subscriptions for named event.
   */
  has(name: string): boolean;
}

declare const Evented: Mixin;
export default Evented;
