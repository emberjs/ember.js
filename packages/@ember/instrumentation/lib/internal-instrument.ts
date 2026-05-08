import { ENV } from '@ember/-internals/environment/lib/env';
import { assert } from '@ember/debug';

export interface Listener<T> {
  before: (name: string, timestamp: number, payload: object) => T;
  after: (name: string, timestamp: number, payload: object, beforeValue: T) => void;
}

export interface Subscriber<T> {
  pattern: string;
  regex: RegExp;
  object: Listener<T>;
}

export interface StructuredProfilePayload {
  object: string | object;
}

export const subscribers: Subscriber<any>[] = [];

export const cache: { [key: string]: Listener<any>[] } = {};

export function resetCache(): void {
  for (const key of Object.keys(cache)) {
    delete cache[key];
  }
}

function populateListeners(name: string): Listener<any>[] {
  let listeners: Listener<any>[] = [];

  for (let subscriber of subscribers) {
    if (subscriber.regex.test(name)) {
      listeners.push(subscriber.object);
    }
  }

  cache[name] = listeners;
  return listeners;
}

const time = (): number => performance.now();

export const NOOP = (): void => {};

// `flaggedInstrument` historically wrapped a callback in conditionally-
// enabled instrumentation; today it's a thin pass-through.
export function flaggedInstrument<Result>(
  _name: string,
  _payload: object,
  callback: () => Result
): Result {
  return callback();
}

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
    // eslint-disable-next-line no-console
    console.time(timeName);
  }

  let beforeValues: any[] = [];
  let timestamp = time();
  for (let listener of listeners) {
    beforeValues.push(listener.before(name, timestamp, payload));
  }

  const constListeners = listeners;

  return function _instrumentEnd(): void {
    let timestamp = time();
    for (let i = 0; i < constListeners.length; i++) {
      let listener = constListeners[i];
      assert('has listener', listener);
      if (typeof listener.after === 'function') {
        listener.after(name, timestamp, payload, beforeValues[i]);
      }
    }

    if (STRUCTURED_PROFILE) {
      // eslint-disable-next-line no-console
      console.timeEnd(timeName);
    }
  };
}
