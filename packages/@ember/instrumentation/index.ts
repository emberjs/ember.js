/* eslint no-console:off */
/* global console */

import { ENV } from '@ember/-internals/environment';
import { EMBER_IMPROVED_INSTRUMENTATION } from '@ember/canary-features';

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

interface MaybePerf {
  now?: () => number;
  mozNow?: () => number;
  webkitNow?: () => number;
  msNow?: () => number;
  oNow?: () => number;
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
export let subscribers: Subscriber<any>[] = [];
let cache: { [key: string]: Listener<any>[] } = {};

function populateListeners(name: string) {
  let listeners: Listener<any>[] = [];
  let subscriber;

  for (let i = 0; i < subscribers.length; i++) {
    subscriber = subscribers[i];
    if (subscriber.regex.test(name)) {
      listeners.push(subscriber.object);
    }
  }

  cache[name] = listeners;
  return listeners;
}

const time = ((): (() => number) => {
  let perf: MaybePerf = 'undefined' !== typeof window ? window.performance || {} : {};
  let fn = perf.now || perf.mozNow || perf.webkitNow || perf.msNow || perf.oNow;

  return fn ? fn.bind(perf) : Date.now;
})();

type InstrumentCallback<Binding, Result> = (this: Binding) => Result;

function isCallback<Binding, Result>(
  value: InstrumentCallback<Binding, Result> | object
): value is InstrumentCallback<Binding, Result> {
  return typeof value === 'function';
}

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
export function instrument<Binding, Result>(
  name: string,
  p1: InstrumentCallback<Binding, Result> | object,
  p2?: Binding | InstrumentCallback<Binding, Result>,
  p3?: Binding
): Result {
  let _payload: object | undefined;
  let callback: InstrumentCallback<Binding, Result>;
  let binding: Binding;

  if (arguments.length <= 3 && isCallback(p1)) {
    callback = p1;
    binding = p2 as Binding;
  } else {
    _payload = p1 as object;
    callback = p2 as InstrumentCallback<Binding, Result>;
    binding = p3 as Binding;
  }

  // fast path
  if (subscribers.length === 0) {
    return callback.call(binding);
  }

  // avoid allocating the payload in fast path
  let payload = _payload || {};

  let finalizer = _instrumentStart(name, () => payload);

  if (finalizer === NOOP) {
    return callback.call(binding);
  } else {
    return withFinalizer(callback, finalizer, payload, binding);
  }
}

let flaggedInstrument: <Result>(name: string, payload: object, callback: () => Result) => Result;

if (EMBER_IMPROVED_INSTRUMENTATION) {
  flaggedInstrument = instrument;
} else {
  flaggedInstrument = function instrument<Result>(
    _name: string,
    _payload: object,
    callback: () => Result
  ): Result {
    return callback();
  };
}

export { flaggedInstrument };

function withFinalizer<Binding, Result>(
  callback: InstrumentCallback<Binding, Result>,
  finalizer: () => void,
  payload: object,
  binding: Binding
): Result {
  try {
    return callback.call(binding);
  } catch (e) {
    (payload as { exception: any }).exception = e;
    throw e;
  } finally {
    finalizer();
  }
}

function NOOP() {}

// private for now
export function _instrumentStart(name: string, payloadFunc: () => object): () => void;
export function _instrumentStart<Arg>(
  name: string,
  payloadFunc: (arg: Arg) => object,
  payloadArg: Arg
): () => void;
export function _instrumentStart<Arg>(
  name: string,
  payloadFunc: ((arg: Arg) => object) | (() => object),
  payloadArg?: Arg
): () => void {
  if (subscribers.length === 0) {
    return NOOP;
  }

  let listeners = cache[name];

  if (!listeners) {
    listeners = populateListeners(name);
  }

  if (listeners.length === 0) {
    return NOOP;
  }

  let payload = payloadFunc(payloadArg!);

  let STRUCTURED_PROFILE = ENV.STRUCTURED_PROFILE;
  let timeName: string;
  if (STRUCTURED_PROFILE) {
    timeName = `${name}: ${(payload as StructuredProfilePayload).object}`;
    console.time(timeName);
  }

  let beforeValues: any[] = [];
  let timestamp = time();
  for (let i = 0; i < listeners.length; i++) {
    let listener = listeners[i];
    beforeValues.push(listener.before(name, timestamp, payload));
  }

  return function _instrumentEnd(): void {
    let timestamp = time();
    for (let i = 0; i < listeners.length; i++) {
      let listener = listeners[i];
      if (typeof listener.after === 'function') {
        listener.after(name, timestamp, payload, beforeValues[i]);
      }
    }

    if (STRUCTURED_PROFILE) {
      console.timeEnd(timeName);
    }
  };
}

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
export function subscribe<T>(pattern: string, object: Listener<T>): Subscriber<T> {
  let paths = pattern.split('.');
  let path;
  let regexes: string[] = [];

  for (let i = 0; i < paths.length; i++) {
    path = paths[i];
    if (path === '*') {
      regexes.push('[^\\.]*');
    } else {
      regexes.push(path);
    }
  }

  let regex = regexes.join('\\.');
  regex = `${regex}(\\..*)?`;

  let subscriber = {
    pattern,
    regex: new RegExp(`^${regex}$`),
    object,
  };

  subscribers.push(subscriber);
  cache = {};

  return subscriber;
}

/**
  Unsubscribes from a particular event or instrumented block of code.

  @method unsubscribe
  @for @ember/instrumentation
  @static

  @param {Object} [subscriber]
  @private
*/
export function unsubscribe(subscriber: Subscriber<any>): void {
  let index = 0;

  for (let i = 0; i < subscribers.length; i++) {
    if (subscribers[i] === subscriber) {
      index = i;
    }
  }

  subscribers.splice(index, 1);
  cache = {};
}

/**
  Resets `Instrumentation` by flushing list of subscribers.

  @method reset
  @for @ember/instrumentation
  @static
  @private
*/
export function reset(): void {
  subscribers.length = 0;
  cache = {};
}
