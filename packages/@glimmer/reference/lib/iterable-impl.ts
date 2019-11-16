import { AbstractIterable, IterationItem, OpaqueIterator, OpaqueIterationItem } from './iterable';
import { VersionedReference } from './reference';
import { Tag } from '@glimmer/validator';
import { Option, Dict } from '@glimmer/interfaces';
import { EMPTY_ARRAY, isObject } from '@glimmer/util';
import { DEBUG } from '@glimmer/local-debug-flags';
import { UpdatableReference } from './property';

export interface IteratorDelegate {
  isEmpty(): boolean;
  next(): { value: unknown; memo: unknown } | null;
}

type KeyFor = (item: unknown, index: unknown) => unknown;

const KEY: KeyFor = (_, index) => index;
const INDEX: KeyFor = (_, index) => String(index);
const PRIMITIVE: KeyFor = item => String(item);
const IDENTITY: KeyFor = item => item;

function keyForPath(path: string, getPath: (item: any, path: string) => any): KeyFor {
  if (DEBUG && path[0] === '@') {
    throw new Error(`invalid keypath: '${keyForPath}'`);
  }
  return uniqueKeyFor(item => getPath(item, path));
}

function makeKeyFor(key: string, getPath: (item: any, path: string) => any) {
  switch (key) {
    case '@key':
      return uniqueKeyFor(KEY);
    case '@index':
      return uniqueKeyFor(INDEX);
    case '@primitive':
      return uniqueKeyFor(PRIMITIVE);
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
    if (isObject(key)) {
      this.weakMap.set(key as object, value);
    } else {
      this.primitiveMap.set(key, value);
    }
  }

  get(key: unknown): T | undefined {
    if (isObject(key)) {
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
    let count = seen.get(value) || 0;

    seen.set(key, count + 1);

    if (count === 0) {
      return key;
    }

    return identityForNthOccurence(key, count);
  };
}

export class IterableImpl
  implements
    AbstractIterable<
      unknown,
      unknown,
      IterationItem<unknown, unknown>,
      UpdatableReference<unknown>,
      UpdatableReference<unknown>
    > {
  public tag: Tag;

  constructor(
    private ref: VersionedReference,
    private key: string,
    private iteratorFor: (iterable: unknown) => IteratorDelegate | undefined,
    private getPath: (item: any, path: string) => any
  ) {
    this.tag = ref.tag;
    this.ref = ref;
    this.key = key;
    this.iteratorFor = iteratorFor;
    this.getPath = getPath;
  }

  iterate(): OpaqueIterator {
    let { ref, key, iteratorFor, getPath } = this;

    let iterable = ref.value() as { [Symbol.iterator]: any } | null | false;

    let keyFor = makeKeyFor(key, getPath);

    if (Array.isArray(iterable)) {
      return new ArrayIterator(iterable, keyFor);
    }

    let maybeIterator = iteratorFor(iterable);

    if (maybeIterator === undefined) {
      return new ArrayIterator(EMPTY_ARRAY, () => null);
    }

    return new IteratorWrapper(maybeIterator, keyFor);
  }

  valueReferenceFor(item: IterationItem<unknown, unknown>): UpdatableReference<unknown> {
    return new UpdatableReference(item.value);
  }

  updateValueReference(
    reference: UpdatableReference<unknown>,
    item: IterationItem<unknown, unknown>
  ) {
    reference.forceUpdate(item.value);
  }

  memoReferenceFor(item: IterationItem<unknown, unknown>): UpdatableReference<unknown> {
    return new UpdatableReference(item.memo);
  }

  updateMemoReference(
    reference: UpdatableReference<unknown>,
    item: IterationItem<unknown, unknown>
  ) {
    reference.forceUpdate(item.memo);
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
