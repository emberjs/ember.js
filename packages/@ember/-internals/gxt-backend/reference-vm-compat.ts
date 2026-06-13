// @glimmer/reference — VM-COMPAT (test-only) surface: the IterableReference
// port (createIteratorRef / createIteratorItemRef / IterableReference /
// uniqueKeyFor).
//
// A dist closure-trace from @ember/application + @ember/component +
// @ember/routing + @ember/-internals/glimmer shows NONE of these are reached by
// a live GXT-mode runtime path: the only value-importers are the
// `@glimmer/runtime` opcode core (purged from the GXT dist) and the
// `@glimmer/reference: IterableReference` test suite. Keeping the port in this
// separate module — rooted only by the `@glimmer/reference` package-entry
// facade (`./reference-entry`) and the vite test tree, neither in the app
// closure — tree-shakes its bytes out of what a precompiled app ships.
//
// This module only CALLS runtime ref/tag primitives (imported from `./reference`
// and `./validator`), so the physical split is behavior-preserving.

import { cell, formula } from '@lifeart/gxt';
import { valueForRef, brandRef } from './reference';
import { consumeTag, createTag, dirtyTag } from './validator';

type KeyFor = (item: unknown, memo: unknown) => unknown;

const NULL_IDENTITY = {};

const KEY_AT_INDEX: KeyFor = (_, index) => index;
const INDEX_KEY: KeyFor = (_, index) => String(index);
const IDENTITY_KEY: KeyFor = (item) => {
  if (item === null) return NULL_IDENTITY;
  return item;
};

function isIndexable(v: unknown): v is object {
  return v !== null && (typeof v === 'object' || typeof v === 'function');
}

class WeakMapWithPrimitives<T> {
  private _weakMap?: WeakMap<object, T>;
  private _primitiveMap?: Map<unknown, T>;
  private get weakMap() {
    if (!this._weakMap) this._weakMap = new WeakMap();
    return this._weakMap;
  }
  private get primitiveMap() {
    if (!this._primitiveMap) this._primitiveMap = new Map();
    return this._primitiveMap;
  }
  set(key: unknown, value: T) {
    if (isIndexable(key)) this.weakMap.set(key, value);
    else this.primitiveMap.set(key, value);
  }
  get(key: unknown): T | undefined {
    if (isIndexable(key)) return this.weakMap.get(key);
    return this.primitiveMap.get(key);
  }
}

const IDENTITIES = new WeakMapWithPrimitives<object[]>();

function identityForNthOccurence(value: unknown, count: number) {
  let identities = IDENTITIES.get(value);
  if (identities === undefined) {
    identities = [];
    IDENTITIES.set(value, identities);
  }
  let identity = identities[count];
  if (identity === undefined) {
    identity = { value, count } as object;
    identities[count] = identity;
  }
  return identity;
}

export function uniqueKeyFor(keyFor: KeyFor): KeyFor {
  const seen = new WeakMapWithPrimitives<number>();
  return (value: unknown, memo: unknown) => {
    const key = keyFor(value, memo);
    const count = seen.get(key) || 0;
    seen.set(key, count + 1);
    if (count === 0) return key;
    return identityForNthOccurence(key, count);
  };
}

function getPath(obj: object, path: string): unknown {
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function makeKeyFor(key: string): KeyFor {
  switch (key) {
    case '@key':
      return uniqueKeyFor(KEY_AT_INDEX);
    case '@index':
      return uniqueKeyFor(INDEX_KEY);
    case '@identity':
      return uniqueKeyFor(IDENTITY_KEY);
    default:
      if (key[0] === '@') {
        throw new Error(`invalid keypath: '${key}', valid keys: @index, @identity, or a path`);
      }
      return uniqueKeyFor((item) => getPath(item as object, key));
  }
}

export interface IterationItem {
  key: unknown;
  value: unknown;
  memo: unknown;
}

export interface OpaqueIterator {
  isEmpty(): boolean;
  next(): IterationItem | null;
}

class ArrayIterator implements OpaqueIterator {
  private current: { kind: 'empty' } | { kind: 'first'; value: unknown } | { kind: 'progress' };
  private pos = 0;

  constructor(
    private iterator: unknown[] | readonly unknown[],
    private keyFor: KeyFor
  ) {
    if (iterator.length === 0) {
      this.current = { kind: 'empty' };
    } else {
      this.current = { kind: 'first', value: iterator[0] };
    }
  }

  isEmpty(): boolean {
    return this.current.kind === 'empty';
  }

  next(): IterationItem | null {
    let value: unknown;
    const current = this.current;
    if (current.kind === 'first') {
      this.current = { kind: 'progress' };
      value = current.value;
    } else if (this.pos >= this.iterator.length - 1) {
      return null;
    } else {
      value = this.iterator[++this.pos];
    }
    const memo = this.pos;
    const key = this.keyFor(value, memo);
    return { key, value, memo };
  }
}

interface IteratorDelegate {
  isEmpty(): boolean;
  next(): { value: unknown; memo: unknown } | null;
}

class IteratorWrapper implements OpaqueIterator {
  constructor(
    private inner: IteratorDelegate,
    private keyFor: KeyFor
  ) {}
  isEmpty() {
    return this.inner.isEmpty();
  }
  next(): IterationItem | null {
    const nextValue = this.inner.next() as IterationItem | null;
    if (nextValue !== null) {
      nextValue.key = this.keyFor(nextValue.value, nextValue.memo);
    }
    return nextValue;
  }
}

const EMPTY: readonly unknown[] = Object.freeze([]);

function nativeToIterator(iterable: unknown): IteratorDelegate | null {
  if (iterable == null) return null;
  if (typeof (iterable as any)[Symbol.iterator] !== 'function') return null;
  const it = (iterable as any)[Symbol.iterator]();
  let index = -1;
  let done = false;
  let peeked: { value: unknown; memo: unknown } | null = null;
  const advance = () => {
    const step = it.next();
    if (step.done) {
      done = true;
      peeked = null;
    } else {
      index += 1;
      peeked = { value: step.value, memo: index };
    }
  };
  advance();
  return {
    isEmpty() {
      return done && peeked === null && index === -1;
    },
    next() {
      if (peeked === null) return null;
      const result = peeked;
      advance();
      return result;
    },
  };
}

// Create a reference for iterating over a collection.
// Signature: createIteratorRef(listRef, key) → ComputeRef<OpaqueIterator>
export function createIteratorRef(listRef: any, key: string = '@identity') {
  const ref = formula(() => {
    const iterable = valueForRef(listRef);
    const keyFor = makeKeyFor(key);
    if (Array.isArray(iterable)) {
      return new ArrayIterator(iterable, keyFor);
    }
    if (iterable == null || iterable === false) {
      return new ArrayIterator(EMPTY, () => null);
    }
    const delegate = nativeToIterator(iterable);
    if (delegate === null) {
      return new ArrayIterator(EMPTY, () => null);
    }
    return new IteratorWrapper(delegate, keyFor);
  }, 'iteratorRef');
  return brandRef(ref, 1 /* COMPUTE */);
}

// Create a reference for an item in an iteration. Mirrors @glimmer/reference:
// returns a compute ref whose value can be updated, backed by a cell so that
// consumers observing it re-run on change.
export function createIteratorItemRef(_value: unknown) {
  const backing = cell(_value, 'iteratorItemRef');
  // Classic-validator tag so downstream consumers using `createCache` /
  // `consumeTag` (e.g. `childRefFor` → `createCache(childCompute)` for
  // `{{p.name}}`) record a dependency on this item's identity. Without
  // this, the child cache reads `valueForRef(iterRef)` which only
  // establishes a GXT-internal subscription on the backing cell — that
  // subscription does NOT propagate to `_cacheTagTracker`, so the cache
  // marks itself as constant (`_consumedTags.length === 0`) on first
  // evaluation and never re-runs when the iterated item is swapped via
  // `updateRef(iterRef, newItem)` (stock @glimmer/runtime's each
  // `retainItem` path). Result: `{{p.name}}` continues to read the
  // closure-captured original item and the rendered text stays stale.
  // See ember.js initial-render `Loops` test for the exact repro.
  const tag = createTag();
  const ref = formula(() => {
    consumeTag(tag);
    return backing.value;
  }, 'iteratorItemRef');
  (ref as any).update = (newValue: unknown) => {
    if (backing.value !== newValue) {
      backing.value = newValue;
      dirtyTag(tag);
    }
  };
  return brandRef(ref, 1 /* COMPUTE */);
}

// Exported class alias for the iterable reference concept. The test module
// `@glimmer/reference: IterableReference` exercises createIteratorRef directly;
// this small wrapper exposes the class so callers looking for it can find it.
export class IterableReference {
  static create(listRef: any, key: string = '@identity') {
    return createIteratorRef(listRef, key);
  }
}
