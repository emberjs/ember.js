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
  // fn.bind will be available in all the browsers that support the advanced window.performance... ;-)
  return fn
    ? fn.bind(perf)
    : () => {
        return Number(new Date());
      };
})();

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
export function instrument<T extends object>(name: string, callback: () => T, binding: object): T;
export function instrument<TPayload extends object>(
  name: string,
  payload: object,
  callback: () => TPayload,
  binding: object
): TPayload;
export function instrument<TPayload extends object>(
  name: string,
  p1: (() => TPayload) | TPayload,
  p2: TPayload | (() => TPayload),
  p3?: object
): TPayload {
  let payload: TPayload;
  let callback: () => TPayload;
  let binding: object;
  if (arguments.length <= 3 && typeof p1 === 'function') {
    payload = {} as TPayload;
    callback = p1;
    binding = p2;
  } else {
    payload = (p1 || {}) as TPayload;
    callback = p2 as () => TPayload;
    binding = p3 as TPayload;
  }
  if (subscribers.length === 0) {
    return callback.call(binding);
  }
  let finalizer = _instrumentStart(name, () => payload);

  if (finalizer) {
    return withFinalizer(callback, finalizer, payload, binding);
  } else {
    return callback.call(binding);
  }
}

let flaggedInstrument: <T, TPayload>(name: string, payload: TPayload, callback: () => T) => T;
if (EMBER_IMPROVED_INSTRUMENTATION) {
  flaggedInstrument = instrument as typeof flaggedInstrument;
} else {
  flaggedInstrument = <T, TPayload>(_name: string, _payload: TPayload, callback: () => T) =>
    callback();
}
export { flaggedInstrument };

function withFinalizer<T extends object>(
  callback: () => T,
  finalizer: () => void,
  payload: T,
  binding: object
): T & PayloadWithException {
  let result: T;
  try {
    result = callback.call(binding);
  } catch (e) {
    (payload as PayloadWithException).exception = e;
    result = payload;
  } finally {
    finalizer();
  }
  return result;
}

function NOOP() {}

// private for now
export function _instrumentStart<TPayloadParam>(
  name: string,
  _payload: (_payloadParam: TPayloadParam) => object,
  _payloadParam: TPayloadParam
): () => void;
export function _instrumentStart<TPayloadParam>(name: string, _payload: () => object): () => void;
export function _instrumentStart<TPayloadParam>(
  name: string,
  _payload: (_payloadParam: TPayloadParam) => object,
  _payloadParam?: TPayloadParam
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

  let payload = _payload(_payloadParam!);

  let STRUCTURED_PROFILE = ENV.STRUCTURED_PROFILE;
  let timeName: string;
  if (STRUCTURED_PROFILE) {
    timeName = `${name}: ${(payload as StructuredProfilePayload).object}`;
    console.time(timeName);
  }

  let beforeValues = new Array(listeners.length);
  let i: number;
  let listener: Listener<any>;
  let timestamp = time();
  for (i = 0; i < listeners.length; i++) {
    listener = listeners[i];
    beforeValues[i] = listener.before(name, timestamp, payload);
  }

  return function _instrumentEnd(): void {
    let i: number;
    let listener: Listener<any>;
    let timestamp = time();
    for (i = 0; i < listeners.length; i++) {
      listener = listeners[i];
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
