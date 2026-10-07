// The existing public cache API (§07-3.4) and the `@cached` decorator (§07-3.3), implemented in
// terms of `cached()` as §07-2.2.6 proposes. Error messages are those of today's implementation.

import { cached, isCachedValue, isConst as isConstCached } from './core.mjs';

export function createCache(fn, debuggingLabel) {
  if (typeof fn !== 'function') {
    throw new Error(
      `createCache() must be passed a function as its first parameter. Called with: ${String(fn)}`
    );
  }
  return cached(fn, { description: debuggingLabel || undefined });
}

function assertCache(c, name) {
  // Accepts any `cached()` value: a `createCache` cache is one.
  if (!isCachedValue(c)) {
    throw new Error(
      `${name}() can only be used on an instance of a cache created with createCache(). Called with: ${String(c)}`
    );
  }
}

export function getValue(c) {
  assertCache(c, 'getValue');
  return c.value;
}

export function isConst(c) {
  assertCache(c, 'isConst');
  return isConstCached(c);
}

// Legacy (experimental) decorator form of `@cached`, as RFC 1218 sketches it.
export function cachedDecorator(target, key, desc) {
  let caches = new WeakMap();
  let { get } = desc;
  return {
    ...desc,
    get() {
      let c = caches.get(this);
      if (c === undefined) {
        c = cached(() => get.call(this), { description: `cached:${String(key)}` });
        caches.set(this, c);
      }
      return c.value;
    },
  };
}
