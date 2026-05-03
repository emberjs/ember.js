import {
  NOOP,
  _instrumentStart,
  resetCache,
  subscribers,
  type Listener,
  type Subscriber,
} from './lib/internal-instrument';

export { _instrumentStart, flaggedInstrument, subscribers } from './lib/internal-instrument';
export type { Listener, Subscriber, StructuredProfilePayload } from './lib/internal-instrument';

export interface PayloadWithException {
  exception?: any;
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
  let regexes: string[] = [];

  for (let path of paths) {
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
  resetCache();

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
  resetCache();
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
  resetCache();
}
