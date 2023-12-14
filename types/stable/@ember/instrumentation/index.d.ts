declare module '@ember/instrumentation' {
  export interface Listener<T> {
    before: (name: string, timestamp: number, payload: object) => T;
    after: (name: string, timestamp: number, payload: object, beforeValue: T) => void;
  }
  export interface Subscriber<T> {
    pattern: string;
    regex: RegExp;
    object: Listener<T>;
  }
  export interface PayloadWithException {
    exception?: any;
  }
  export interface StructuredProfilePayload {
    object: string | object;
  }
  /**
    @module @ember/instrumentation
    @private
    */
  /**
      The purpose of the Ember Instrumentation module is
      to provide efficient, general-purpose instrumentation
      for Ember.

      Subscribe to a listener by using `subscribe`:

      ```javascript
      import { subscribe } from '@ember/instrumentation';

      subscribe("render", {
        before(name, timestamp, payload) {

        },

        after(name, timestamp, payload) {

        }
      });
      ```

      If you return a value from the `before` callback, that same
      value will be passed as a fourth parameter to the `after`
      callback.

      Instrument a block of code by using `instrument`:

      ```javascript
      import { instrument } from '@ember/instrumentation';

      instrument("render.handlebars", payload, function() {
        // rendering logic
      }, binding);
      ```

      Event names passed to `instrument` are namespaced
      by periods, from more general to more specific. Subscribers
      can listen for events by whatever level of granularity they
      are interested in.

      In the above example, the event is `render.handlebars`,
      and the subscriber listened for all events beginning with
      `render`. It would receive callbacks for events named
      `render`, `render.handlebars`, `render.container`, or
      even `render.handlebars.layout`.

      @class Instrumentation
      @static
      @private
    */
  export let subscribers: Subscriber<any>[];
  type InstrumentCallback<Binding, Result> = (this: Binding) => Result;
  /**
      Notifies event's subscribers, calls `before` and `after` hooks.

      @method instrument
      @for @ember/instrumentation
      @static
      @param {String} [name] Namespaced event name.
      @param {Object} payload
      @param {Function} callback Function that you're instrumenting.
      @param {Object} binding Context that instrument function is called with.
      @private
    */
  export function instrument<Result>(
    name: string,
    callback: InstrumentCallback<undefined, Result>
  ): Result;
  export function instrument<Binding, Result>(
    name: string,
    callback: InstrumentCallback<Binding, Result>,
    binding: Binding
  ): Result;
  export function instrument<Result>(
    name: string,
    payload: object,
    callback: InstrumentCallback<undefined, Result>
  ): Result;
  export function instrument<Binding, Result>(
    name: string,
    payload: object,
    callback: InstrumentCallback<Binding, Result>,
    binding: Binding
  ): Result;
  export function flaggedInstrument<Result>(
    _name: string,
    _payload: object,
    callback: () => Result
  ): Result;
  export function _instrumentStart(name: string, payloadFunc: () => object): () => void;
  export function _instrumentStart<Arg>(
    name: string,
    payloadFunc: (arg: Arg) => object,
    payloadArg: Arg
  ): () => void;
  /**
      Subscribes to a particular event or instrumented block of code.

      @method subscribe
      @for @ember/instrumentation
      @static

      @param {String} [pattern] Namespaced event name.
      @param {Object} [object] Before and After hooks.

      @return {Subscriber}
      @private
    */
  export function subscribe<T>(pattern: string, object: Listener<T>): Subscriber<T>;
  /**
      Unsubscribes from a particular event or instrumented block of code.

      @method unsubscribe
      @for @ember/instrumentation
      @static

      @param {Object} [subscriber]
      @private
    */
  export function unsubscribe(subscriber: Subscriber<any>): void;
  /**
      Resets `Instrumentation` by flushing list of subscribers.

      @method reset
      @for @ember/instrumentation
      @static
      @private
    */
  export function reset(): void;
  export {};
}
