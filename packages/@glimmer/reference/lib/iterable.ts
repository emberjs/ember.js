import { Tag } from '@glimmer/validator';
import { Option, Dict } from '@glimmer/interfaces';
import { EMPTY_ARRAY, isObject, debugToString, expect } from '@glimmer/util';
import { DEBUG } from '@glimmer/env';
import { IterationItemReference, TemplateReferenceEnvironment } from './template';
import { VersionedPathReference } from './reference';

export interface IterationItem<T, U> {
  key: unknown;
  value: T;
  memo: U;
}

export interface AbstractIterator<T, U, V extends IterationItem<T, U>> {
  isEmpty(): boolean;
  next(): Option<V>;
}

export type Iterator<T, U> = AbstractIterator<T, U, IterationItem<T, U>>;

export type OpaqueIterationItem = IterationItem<unknown, unknown>;
export type OpaqueIterator = AbstractIterator<unknown, unknown, OpaqueIterationItem>;

export interface IteratorDelegate {
  isEmpty(): boolean;
  next(): { value: unknown; memo: unknown } | null;
}

type KeyFor = (item: unknown, index: unknown) => unknown;

const NULL_IDENTITY = {};

const KEY: KeyFor = (_, index) => index;
const INDEX: KeyFor = (_, index) => String(index);
const IDENTITY: KeyFor = item => {
  if (item === null) {
    // Returning null as an identity will cause failures since the iterator
    // can't tell that it's actually supposed to be null
    return NULL_IDENTITY;
  }

  return item;
};

function keyForPath(path: string, getPath: (item: unknown, path: string) => any): KeyFor {
  if (DEBUG && path[0] === '@') {
    throw new Error(`invalid keypath: '${path}', valid keys: @index, @identity, or a path`);
  }
  return uniqueKeyFor(item => getPath(item, path));
}

function makeKeyFor(key: string, getPath: (item: unknown, path: string) => any) {
  switch (key) {
    case '@key':
      return uniqueKeyFor(KEY);
    case '@index':
      return uniqueKeyFor(INDEX);
    case '@identity':
      return uniqueKeyFor(IDENTITY);
    default:
      return keyForPath(key, getPath);
  }
}

class WeakMapWithPrimitives<T> {
  private _weakMap?: WeakMap<object, T>;
  private _primitiveMap?: Map<unknown, T>;

  private get weakMap() {
    if (this._weakMap === undefined) {
      this._weakMap = new WeakMap();
    }

    return this._weakMap;
  }

  private get primitiveMap() {
    if (this._primitiveMap === undefined) {
      this._primitiveMap = new Map();
    }

    return this._primitiveMap;
  }

  set(key: unknown, value: T) {
    if (isObject(key) || typeof key === 'function') {
      this.weakMap.set(key as object, value);
    } else {
      this.primitiveMap.set(key, value);
    }
  }

  get(key: unknown): T | undefined {
    if (isObject(key) || typeof key === 'function') {
      return this.weakMap.get(key as object);
    } else {
      return this.primitiveMap.get(key);
    }
  }
}

const IDENTITIES = new WeakMapWithPrimitives<object[]>();

function identityForNthOccurence(value: any, count: number) {
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

export class IterableReference {
  public tag: Tag;

  private iterator: Option<OpaqueIterator> = null;

  constructor(
    private parentRef: VersionedPathReference,
    private key: string,
    private env: TemplateReferenceEnvironment
  ) {
    this.tag = parentRef.tag;
  }

  value(): boolean {
    return !this.isEmpty();
  }

  isEmpty(): boolean {
    let iterator = (this.iterator = this.createIterator());
    return iterator.isEmpty();
  }

  next(): Option<OpaqueIterationItem> {
    let iterator = expect(
      this.iterator,
      'VM BUG: Expected an iterator to be created before calling `next`'
    );

    let item = iterator.next();

    if (item === null) {
      this.iterator = null;
    }

    return item;
  }

  private createIterator(): OpaqueIterator {
    let { parentRef, key, env } = this;

    let iterable = parentRef.value() as { [Symbol.iterator]: any } | null | false;

    let keyFor = makeKeyFor(key, env.getPath);

    if (Array.isArray(iterable)) {
      return new ArrayIterator(iterable, keyFor);
    }

    let maybeIterator = env.toIterator(iterable);

    if (maybeIterator === null) {
      return new ArrayIterator(EMPTY_ARRAY, () => null);
    }

    return new IteratorWrapper(maybeIterator, keyFor);
  }

  childRefFor(key: unknown, value: unknown): IterationItemReference<unknown> {
    let { parentRef, env } = this;

    return new IterationItemReference(
      parentRef,
      value,
      DEBUG ? `(key: ${debugToString!(key)}` : '',
      env
    );
  }
}

class IteratorWrapper implements OpaqueIterator {
  constructor(private inner: IteratorDelegate, private keyFor: KeyFor) {}

  isEmpty() {
    return this.inner.isEmpty();
  }

  next() {
    let nextValue = this.inner.next() as OpaqueIterationItem;

    if (nextValue !== null) {
      nextValue.key = this.keyFor(nextValue.value, nextValue.memo);
    }

    return nextValue;
  }
}

class ArrayIterator implements OpaqueIterator {
  private current: { kind: 'empty' } | { kind: 'first'; value: unknown } | { kind: 'progress' };
  private pos = 0;

  constructor(private iterator: unknown[], private keyFor: KeyFor) {
    if (iterator.length === 0) {
      this.current = { kind: 'empty' };
    } else {
      this.current = { kind: 'first', value: iterator[this.pos] };
    }
  }

  isEmpty(): boolean {
    return this.current.kind === 'empty';
  }

  next(): Option<IterationItem<unknown, number>> {
    let value: unknown;

    let current = this.current;
    if (current.kind === 'first') {
      this.current = { kind: 'progress' };
      value = current.value;
    } else if (this.pos >= this.iterator.length - 1) {
      return null;
    } else {
      value = this.iterator[++this.pos];
    }

    let { keyFor } = this;

    let key = keyFor(value as Dict, this.pos);
    let memo = this.pos;

    return { key, value, memo };
  }
}
