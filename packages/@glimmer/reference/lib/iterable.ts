import { DEBUG } from '@glimmer/env';
import type { Nullable } from '@glimmer/interfaces';
import { getPath, toIterator } from '@glimmer/global-context';
import { EMPTY_ARRAY } from '@glimmer/util/lib/array-utils';
import { isIndexable } from '@glimmer/util/lib/collections';
import { consumeTag } from '@glimmer/validator/lib/tracking';
import { createTag, DIRTY_TAG as dirtyTag } from '@glimmer/validator/lib/validators';

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
    return getPath(item, path);
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

const OBJECT_IDENTITIES = new WeakMap<object, object[]>();
const PRIMITIVE_IDENTITIES = new Map<unknown, object[]>();

function identityForNthOccurence(value: unknown, count: number) {
  let identities: object[] | undefined;

  if (isIndexable(value)) {
    identities = OBJECT_IDENTITIES.get(value);
    if (identities === undefined) OBJECT_IDENTITIES.set(value, (identities = []));
  } else {
    identities = PRIMITIVE_IDENTITIES.get(value);
    if (identities === undefined) PRIMITIVE_IDENTITIES.set(value, (identities = []));
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
  // Two maps rather than a wrapper object: this runs for every item on every
  // pass over a list, and duplicate keys are the rare case.
  let seenObjects: WeakMap<object, number> | undefined;
  let seenPrimitives: Map<unknown, number> | undefined;

  return (value: unknown, memo: unknown) => {
    let key = keyFor(value, memo);
    let count: number | undefined;

    if (isIndexable(key)) {
      seenObjects ??= new WeakMap();
      count = seenObjects.get(key);
      seenObjects.set(key, count === undefined ? 1 : count + 1);
    } else {
      seenPrimitives ??= new Map();
      count = seenPrimitives.get(key);
      seenPrimitives.set(key, count === undefined ? 1 : count + 1);
    }

    return count === undefined ? key : identityForNthOccurence(key, count);
  };
}

export function createIteratorRef(listRef: Reference, key: string) {
  return createComputeRef(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let iterable = valueForRef(listRef) as { [Symbol.iterator]: any } | null | false;

    let keyFor = makeKeyFor(key);

    if (Array.isArray(iterable)) {
      return new ArrayIterator(iterable, keyFor);
    }

    let maybeIterator = toIterator(iterable);

    if (maybeIterator === null) {
      return new ArrayIterator(EMPTY_ARRAY, () => null);
    }

    return new IteratorWrapper(maybeIterator, keyFor);
  });
}

export function createIteratorItemRef(_value: unknown) {
  let value = _value;
  let tag = createTag();

  return createComputeRef(
    () => {
      consumeTag(tag);
      return value;
    },
    (newValue) => {
      if (value !== newValue) {
        value = newValue;
        dirtyTag(tag);
      }
    }
  );
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
  private pos = -1;

  // The constructor runs inside the iterator reference's tracking frame, so
  // reading `length` here is what attributes a tracked collection's tag to that
  // reference. Read it from `next()` instead and the list stops revalidating.
  private length: number;

  constructor(
    private iterator: unknown[] | readonly unknown[],
    private keyFor: KeyFor
  ) {
    this.length = iterator.length;
  }

  isEmpty(): boolean {
    return this.length === 0;
  }

  next(): Nullable<IterationItem<unknown, number>> {
    let memo = ++this.pos;

    if (memo >= this.length) return null;

    let value = this.iterator[memo];

    return { key: this.keyFor(value, memo), value, memo };
  }
}
