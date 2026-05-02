// Hot-path bits of `@ember/instrumentation`, factored out so internal
// callers (the resolver, component managers) don't have to drag in the
// full subscribe/unsubscribe/instrument machinery — most of which is dead
// code unless something actually subscribes (e.g. Ember Inspector).
//
// `subscribers` and `cache` live here; `index.ts` imports and mutates
// them via `subscribe`/`unsubscribe`/`reset`.

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const subscribers: Subscriber<any>[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cache: { [key: string]: Listener<any>[] } = {};

export function resetCache(): void {
  for (const key of Object.keys(cache)) {
    delete cache[key];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function populateListeners(name: string): Listener<any>[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
