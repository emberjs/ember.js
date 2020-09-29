/* eslint-disable no-inner-declarations */
import { DEBUG } from '@glimmer/env';

declare global {
  export function gc(
    type?:
      | 0
      | 1
      | {
          type?: 'minor';
          execution?: 'async';
        }
  ): Promise<void> | void;
  export class FinalizationGroup<T> {
    constructor(finalize: (iter: IterableIterator<T>) => void);
    register(object: object, entry: T, key?: object): void;
    unregister(key: object): void;
  }
  export class FinalizationRegistry<T> {
    constructor(finalize: (iter: IterableIterator<T>) => void);
    register(object: object, entry: T, key?: object): void;
    unregister(key: object): void;
  }
}

export interface TestContext {
  moduleName: string;
  testName: string;
  testId: string;
}

export interface LeakTracker {
  setContext(ctx: TestContext): void;
  track(obj: object): void;
  leaks(): Promise<TestContext[]>;
  reset(): void;
}

export const leakTracker: LeakTracker | undefined = (() => {
  // requires v8 flags
  // chrome --js-flags="--harmony-weak-refs --expose-gc"
  // node --harmony-weak-refs --expose-gc
  if (
    DEBUG &&
    typeof gc === 'function' &&
    (typeof FinalizationGroup === 'function' || typeof FinalizationRegistry === 'function')
  ) {
    // requires flags: --allow-natives-syntax --track-retaining-path
    // slow so run only on a subset of tests
    const trackRetainingPath: (obj: object, flag?: 'track-ephemeron-path') => void = (() => {
      try {
        return new Function('obj', 'flag', `%DebugTrackRetainingPath(obj, flag)`) as any;
      } catch (e) {
        return () => void 0;
      }
    })();
    const unknown = {
      testId: '',
      moduleName: '',
      testName: 'unknown',
    };
    const leakKey = Symbol('leakKey');
    let seq = 0;
    let ctx: TestContext = unknown;
    let map = new Map<{ id: number }, TestContext>();
    const fg =
      typeof FinalizationRegistry === 'function'
        ? new FinalizationRegistry(finalize)
        : new FinalizationGroup(finalize);

    return {
      setContext,
      track,
      leaks,
      reset,
    };

    function setContext(testContext: TestContext) {
      ctx = testContext;
    }

    function track(obj: object) {
      const key = { id: seq++ };
      console.log(`creating key ${key.id}`);
      obj[leakKey] = key;
      map.set(key, ctx);
      fg.register(obj, key, key);
      trackRetainingPath(obj, 'track-ephemeron-path');
    }

    function leaks() {
      if (map.size === 0) {
        return Promise.resolve([]);
      }
      const error = new Error();
      console.log(error.stack);
      return new Promise(resolve => setTimeout(resolve, 0))
        .then(() => gc())
        .then(() => new Promise(resolve => setTimeout(resolve, 0)))
        .then(() => gc())
        .then(() => new Promise(resolve => setTimeout(resolve, 0)))
        .then(() => {
          gc();
          return Array.from(new Set(map.values()));
        });
    }

    function reset() {
      ctx = unknown;
      for (const key of map.keys()) {
        fg.unregister(key);
      }
      map.clear();
    }

    function finalize(keys: IterableIterator<{ id: number }>) {
      for (const key of keys) {
        map.delete(key);
        console.log(`deleting key ${key.id} ${map.size}`);
      }
    }
  }
  return;
})();
