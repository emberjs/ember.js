import { DEBUG } from '@glimmer/env';
import type { Dict, Nullable } from '@glimmer/interfaces';
import { getPath, toIterator } from '@glimmer/global-context';
import { EMPTY_ARRAY, isIndexable } from '@glimmer/util';
import { createTag } from '@glimmer/validator';

import type { Reference, ReferenceEnvironment } from './reference';

import { createComputeRef, valueForRef } from './reference';

export interface IterationItem<T, U> {
  key: unknown;
  value: T;
  memo: U;
}

export interface AbstractIterator<T, U, V extends IterationItem<T, U>> {
  isEmpty(): boolean;
  next(): Nullable<V>;
}

export type OpaqueIterationItem = IterationItem<unknown, unknown>;
export type OpaqueIterator = AbstractIterator<unknown, unknown, OpaqueIterationItem>;

export interface IteratorDelegate {
  isEmpty(): boolean;
  next(): { value: unknown; memo: unknown } | null;
}

export interface IteratorReferenceEnvironment extends ReferenceEnvironment {
  getPath(obj: unknown, path: string): unknown;
  toIterator(obj: unknown): Nullable<IteratorDelegate>;
}

type KeyFor = (item: unknown, index: unknown) => unknown;

const NULL_IDENTITY = {};

const KEY: KeyFor = (_, index) => index;
const INDEX: KeyFor = (_, index) => String(index);
const IDENTITY: KeyFor = (item) => {
  if (item === null) {
    // Returning null as an identity will cause failures since the iterator
    // can't tell that it's actually supposed to be null
    return NULL_IDENTITY;
  }

  return item;
};

function keyForPath(path: string): KeyFor {
  if (DEBUG && path[0] === '@') {
    throw new Error(`invalid keypath: '${path}', valid keys: @index, @identity, or a path`);
  }
  return uniqueKeyFor((item) => {
    if (item === null || item === undefined) {
      return item;
    }
    return getPath(item as object, path);
  });
}

function makeKeyFor(key: string) {
  switch (key) {
    case '@key':
      return uniqueKeyFor(KEY);
    case '@index':
      return uniqueKeyFor(INDEX);
    case '@identity':
      return uniqueKeyFor(IDENTITY);
    default:
      return keyForPath(key);
  }
}

class WeakMapWithPrimitives<T> {
  // Eagerly initialize maps to avoid getter overhead on every access.
  // These are short-lived (one per iteration pass), so the allocation
  // cost is negligible compared to the per-item getter overhead.
  private _weakMap = new WeakMap<object, T>();
  private _primitiveMap = new Map<unknown, T>();

  set(key: unknown, value: T) {
    if (isIndexable(key)) {
      this._weakMap.set(key, value);
    } else {
      this._primitiveMap.set(key, value);
    }
  }

  get(key: unknown): T | undefined {
    if (isIndexable(key)) {
      return this._weakMap.get(key);
    } else {
      return this._primitiveMap.get(key);
    }
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
    identity = { value, count };
    identities[count] = identity;
  }

  return identity;
}

/**
 * When iterating over a list, it's possible that an item with the same unique
 * key could be encountered twice:
 *
 * ```js
 * let arr = ['same', 'different', 'same', 'same'];
 * ```
 *
 * In general, we want to treat these items as _unique within the list_. To do
 * this, we track the occurences of every item as we iterate the list, and when
 * an item occurs more than once, we generate a new unique key just for that
 * item, and that occurence within the list. The next time we iterate the list,
 * and encounter an item for the nth time, we can get the _same_ key, and let
 * Glimmer know that it should reuse the DOM for the previous nth occurence.
 */
function uniqueKeyFor(keyFor: KeyFor) {
  let seen = new WeakMapWithPrimitives<number>();

  return (value: unknown, memo: unknown) => {
    let key = keyFor(value, memo);
    let count = seen.get(key) || 0;

    seen.set(key, count + 1);

    if (count === 0) {
      return key;
    }

    return identityForNthOccurence(key, count);
  };
}

export function createIteratorRef(listRef: Reference, key: string) {
  return createComputeRef(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let iterable = valueForRef(listRef) as { [Symbol.iterator]: any } | null | false;

    // makeKeyFor must be called per-evaluation because uniqueKeyFor tracks
    // seen keys within a single iteration pass via a fresh `seen` map.
    let keyFor = makeKeyFor(key);

    if (Array.isArray(iterable)) {
      // When iterating a TrackedArray (Proxy), each index access goes through
      // the proxy trap: convertToInt + tag lookup + consumeTag for every element.
      // By calling .slice(), we consume the collection tag once via the proxy's
      // ARRAY_GETTER_METHODS path, then iterate a plain array with zero proxy overhead.
      // For 5000 items, this eliminates ~5000 proxy trap invocations.
      let plainArray = iterable.length > 0 ? iterable.slice() : (EMPTY_ARRAY as unknown[]);
      return new ArrayIterator(plainArray, keyFor);
    }

    let maybeIterator = toIterator(iterable);

    if (maybeIterator === null) {
      return new ArrayIterator(EMPTY_ARRAY, () => null);
    }

    return new IteratorWrapper(maybeIterator, keyFor);
  });
}

export function createIteratorItemRef(_value: unknown) {
  let ref = createComputeRef(null as never, null) as Reference & {
    _iterTag: unknown;
    lastValue: unknown;
  };
  ref._iterTag = createTag();
  ref.lastValue = _value;
  return ref as Reference;
}

class IteratorWrapper implements OpaqueIterator {
  constructor(
    private inner: IteratorDelegate,
    private keyFor: KeyFor
  ) {}

  isEmpty() {
    return this.inner.isEmpty();
  }

  next() {
    let nextValue = this.inner.next() as OpaqueIterationItem | null;

    if (nextValue !== null) {
      nextValue.key = this.keyFor(nextValue.value, nextValue.memo);
    }

    return nextValue;
  }
}

class ArrayIterator implements OpaqueIterator {
  private pos = 0;
  private started = false;

  constructor(
    private iterator: unknown[] | readonly unknown[],
    private keyFor: KeyFor
  ) {}

  isEmpty(): boolean {
    return this.iterator.length === 0;
  }

  next(): Nullable<IterationItem<unknown, number>> {
    let value: unknown;

    if (!this.started) {
      this.started = true;
      value = this.iterator[0];
    } else if (this.pos >= this.iterator.length - 1) {
      return null;
    } else {
      value = this.iterator[++this.pos];
    }

    let key = this.keyFor(value as Dict, this.pos);
    let memo = this.pos;

    return { key, value, memo };
  }
}
