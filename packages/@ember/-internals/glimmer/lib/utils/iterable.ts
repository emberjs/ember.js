import { get, objectAt, tagFor, tagForProperty } from '@ember/-internals/metal';
import { _contentFor, isEmberArray } from '@ember/-internals/runtime';
import { guidFor, HAS_NATIVE_SYMBOL, isProxy } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import {
  AbstractIterable,
  combine,
  CONSTANT_TAG,
  IterationItem,
  OpaqueIterator,
  Tag,
  UpdatableTag,
  VersionedReference,
} from '@glimmer/reference';
import { Opaque, Option } from '@glimmer/util';
import { isEachIn } from '../helpers/each-in';
import { UpdatableReference } from './references';

const ITERATOR_KEY_GUID = 'be277757-bbbe-4620-9fcb-213ef433cca2';

// FIXME: export this from Glimmer
type OpaqueIterationItem = IterationItem<Opaque, Opaque>;
type EmberIterable = AbstractIterable<
  Opaque,
  Opaque,
  OpaqueIterationItem,
  UpdatableReference,
  UpdatableReference
>;

export default function iterableFor(
  ref: VersionedReference,
  keyPath: string | null | undefined
): EmberIterable {
  if (isEachIn(ref)) {
    return new EachInIterable(ref, keyPath || '@key');
  } else {
    return new EachIterable(ref, keyPath || '@identity');
  }
}

abstract class BoundedIterator implements OpaqueIterator {
  private position = 0;

  constructor(private length: number, private keyFor: KeyFor) {}

  isEmpty(): false {
    return false;
  }

  abstract valueFor(position: number): Opaque;

  memoFor(position: number): Opaque {
    return position;
  }

  next(): Option<OpaqueIterationItem> {
    let { length, keyFor, position } = this;

    if (position >= length) {
      return null;
    }

    let value = this.valueFor(position);
    let memo = this.memoFor(position);
    let key = keyFor(value, memo, position);

    this.position++;

    return { key, value, memo };
  }
}

class ArrayIterator extends BoundedIterator {
  static from(array: Opaque[], keyFor: KeyFor): OpaqueIterator {
    let { length } = array;

    if (length === 0) {
      return EMPTY_ITERATOR;
    } else {
      return new this(array, length, keyFor);
    }
  }

  static fromForEachable(object: ForEachable, keyFor: KeyFor): OpaqueIterator {
    let array: Opaque[] = [];
    object.forEach(item => array.push(item));
    return this.from(array, keyFor);
  }

  constructor(private array: Opaque[], length: number, keyFor: KeyFor) {
    super(length, keyFor);
  }

  valueFor(position: number): Opaque {
    return this.array[position];
  }
}

class EmberArrayIterator extends BoundedIterator {
  static from(array: Opaque[], keyFor: KeyFor): OpaqueIterator {
    let { length } = array;

    if (length === 0) {
      return EMPTY_ITERATOR;
    } else {
      return new this(array, length, keyFor);
    }
  }

  constructor(private array: Opaque, length: number, keyFor: KeyFor) {
    super(length, keyFor);
  }

  valueFor(position: number): Opaque {
    return objectAt(this.array as any, position);
  }
}

class ObjectIterator extends BoundedIterator {
  static fromIndexable(obj: Indexable, keyFor: KeyFor): OpaqueIterator {
    let keys = Object.keys(obj);
    let values: Opaque[] = [];

    let { length } = keys;

    for (let i = 0; i < length; i++) {
      values.push(get(obj, keys[i]));
    }

    if (length === 0) {
      return EMPTY_ITERATOR;
    } else {
      return new this(keys, values, length, keyFor);
    }
  }

  static fromForEachable(obj: ForEachable, keyFor: KeyFor): OpaqueIterator {
    let keys: Opaque[] = [];
    let values: Opaque[] = [];
    let length = 0;
    let isMapLike = false;

    obj.forEach((value: Opaque, key: Opaque) => {
      isMapLike = isMapLike || arguments.length >= 2;

      if (isMapLike) {
        keys.push(key);
      }
      values.push(value);

      length++;
    });

    if (length === 0) {
      return EMPTY_ITERATOR;
    } else if (isMapLike) {
      return new this(keys, values, length, keyFor);
    } else {
      return new ArrayIterator(values, length, keyFor);
    }
  }

  constructor(private keys: Opaque[], private values: Opaque[], length: number, keyFor: KeyFor) {
    super(length, keyFor);
  }

  valueFor(position: number): Opaque {
    return this.values[position];
  }

  memoFor(position: number): Opaque {
    return this.keys[position];
  }
}

interface NativeIteratorConstructor<T = Opaque> {
  new (iterable: Iterator<T>, result: IteratorResult<T>, keyFor: KeyFor): NativeIterator<T>;
}

abstract class NativeIterator<T = Opaque> implements OpaqueIterator {
  static from<T>(
    this: NativeIteratorConstructor<T>,
    iterable: Iterable<T>,
    keyFor: KeyFor
  ): OpaqueIterator {
    let iterator = iterable[Symbol.iterator]();
    let result = iterator.next();
    let { value, done } = result;

    if (done) {
      return EMPTY_ITERATOR;
    } else if (Array.isArray(value) && value.length === 2) {
      return new this(iterator, result, keyFor);
    } else {
      return new ArrayLikeNativeIterator(iterator, result, keyFor);
    }
  }

  private position = 0;

  constructor(
    private iterable: Iterator<T>,
    private result: IteratorResult<T>,
    private keyFor: KeyFor
  ) {}

  isEmpty(): false {
    return false;
  }

  abstract valueFor(result: IteratorResult<T>, position: number): Opaque;
  abstract memoFor(result: IteratorResult<T>, position: number): Opaque;

  next(): Option<OpaqueIterationItem> {
    let { iterable, result, position, keyFor } = this;

    if (result.done) {
      return null;
    }

    let value = this.valueFor(result, position);
    let memo = this.memoFor(result, position);
    let key = keyFor(value, memo, position);

    this.position++;
    this.result = iterable.next();

    return { key, value, memo };
  }
}

class ArrayLikeNativeIterator extends NativeIterator {
  valueFor(result: IteratorResult<Opaque>): Opaque {
    return result.value;
  }

  memoFor(_result: IteratorResult<Opaque>, position: number): Opaque {
    return position;
  }
}

class MapLikeNativeIterator extends NativeIterator<[Opaque, Opaque]> {
  valueFor(result: IteratorResult<[Opaque, Opaque]>): Opaque {
    return result.value[1];
  }

  memoFor(result: IteratorResult<[Opaque, Opaque]>): Opaque {
    return result.value[0];
  }
}

const EMPTY_ITERATOR: OpaqueIterator = {
  isEmpty(): true {
    return true;
  },

  next(): null {
    assert('Cannot call next() on an empty iterator');
    return null;
  },
};

class EachInIterable implements EmberIterable {
  public tag: Tag;
  private valueTag = UpdatableTag.create(CONSTANT_TAG);

  constructor(private ref: VersionedReference, private keyPath: string) {
    this.tag = combine([ref.tag, this.valueTag]);
  }

  iterate(): OpaqueIterator {
    let { ref, valueTag } = this;

    let iterable = ref.value();
    let tag = tagFor(iterable);

    if (isProxy(iterable)) {
      // this is because the each-in doesn't actually get(proxy, 'key') but bypasses it
      // and the proxy's tag is lazy updated on access
      iterable = _contentFor(iterable);
    }

    valueTag.inner.update(tag);

    if (!isIndexable(iterable)) {
      return EMPTY_ITERATOR;
    }

    if (Array.isArray(iterable) || isEmberArray(iterable)) {
      return ObjectIterator.fromIndexable(iterable, this.keyFor(true));
    } else if (HAS_NATIVE_SYMBOL && isNativeIterable<[Opaque, Opaque]>(iterable)) {
      return MapLikeNativeIterator.from(iterable, this.keyFor());
    } else if (hasForEach(iterable)) {
      return ObjectIterator.fromForEachable(iterable, this.keyFor());
    } else {
      return ObjectIterator.fromIndexable(iterable, this.keyFor(true));
    }
  }

  valueReferenceFor(item: OpaqueIterationItem): UpdatableReference {
    return new UpdatableReference(item.value);
  }

  updateValueReference(ref: UpdatableReference, item: OpaqueIterationItem): void {
    ref.update(item.value);
  }

  memoReferenceFor(item: OpaqueIterationItem): UpdatableReference {
    return new UpdatableReference(item.memo);
  }

  updateMemoReference(ref: UpdatableReference, item: OpaqueIterationItem): void {
    ref.update(item.memo);
  }

  private keyFor(hasUniqueKeys = false): KeyFor {
    let { keyPath } = this;

    switch (keyPath) {
      case '@key':
        return hasUniqueKeys ? ObjectKey : Unique(MapKey);
      case '@index':
        return Index;
      case '@identity':
        return Unique(Identity);
      default:
        assert(`Invalid key: ${keyPath}`, keyPath[0] !== '@');
        return Unique(KeyPath(keyPath));
    }
  }
}

class EachIterable implements EmberIterable {
  public tag: Tag;
  private valueTag = UpdatableTag.create(CONSTANT_TAG);

  constructor(private ref: VersionedReference, private keyPath: string) {
    this.tag = combine([ref.tag, this.valueTag]);
  }

  iterate(): OpaqueIterator {
    let { ref, valueTag } = this;

    let iterable = ref.value();

    valueTag.inner.update(tagForProperty(iterable, '[]'));

    if (iterable === null || typeof iterable !== 'object') {
      return EMPTY_ITERATOR;
    }

    let keyFor = this.keyFor();

    if (Array.isArray(iterable)) {
      return ArrayIterator.from(iterable, keyFor);
    } else if (isEmberArray(iterable)) {
      return EmberArrayIterator.from(iterable as Opaque[], keyFor);
    } else if (HAS_NATIVE_SYMBOL && isNativeIterable(iterable)) {
      return ArrayLikeNativeIterator.from(iterable, keyFor);
    } else if (hasForEach(iterable)) {
      return ArrayIterator.fromForEachable(iterable, keyFor);
    } else {
      return EMPTY_ITERATOR;
    }
  }

  valueReferenceFor(item: OpaqueIterationItem): UpdatableReference {
    return new UpdatableReference(item.value);
  }

  updateValueReference(ref: UpdatableReference, item: OpaqueIterationItem): void {
    ref.update(item.value);
  }

  memoReferenceFor(item: OpaqueIterationItem): UpdatableReference {
    return new UpdatableReference(item.memo as number);
  }

  updateMemoReference(ref: UpdatableReference, item: OpaqueIterationItem): void {
    ref.update(item.memo);
  }

  private keyFor(): KeyFor {
    let { keyPath } = this;

    switch (keyPath) {
      case '@index':
        return Index;
      case '@identity':
        return Unique(Identity);
      default:
        assert(`Invalid key: ${keyPath}`, keyPath[0] !== '@');
        return Unique(KeyPath(keyPath));
    }
  }
}

interface ForEachable {
  forEach(callback: (item: Opaque, key: Opaque) => void): void;
}

function hasForEach(value: object): value is ForEachable {
  return typeof value['forEach'] === 'function';
}

function isNativeIterable<T = Opaque>(value: object): value is Iterable<T> {
  return typeof value[Symbol.iterator] === 'function';
}

interface Indexable {
  readonly [key: string]: Opaque;
}

function isIndexable(value: Opaque): value is Indexable {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

type KeyFor = (value: Opaque, memo: Opaque, position: number) => string;

// Position in an array is guarenteed to be unique
function Index(_value: Opaque, _memo: Opaque, position: number): string {
  return String(position);
}

// Object.keys(...) is guarenteed to be strings and unique
function ObjectKey(_value: Opaque, memo: Opaque): string {
  return memo as string;
}

// Map keys can be any objects
function MapKey(_value: Opaque, memo: Opaque): string {
  return Identity(memo);
}

function Identity(value: Opaque): string {
  switch (typeof value) {
    case 'string':
      return value as string;
    case 'number':
      return String(value);
    default:
      return guidFor(value);
  }
}

function KeyPath(keyPath: string): KeyFor {
  return (value: Opaque) => String(get(value as any, keyPath));
}

function Unique(func: KeyFor): KeyFor {
  let seen = {};

  return (value: Opaque, memo: Opaque, position: number) => {
    let key = func(value, memo, position);
    let count = seen[key];

    if (count === undefined) {
      seen[key] = 0;
      return key;
    } else {
      seen[key] = ++count;
      return `${key}${ITERATOR_KEY_GUID}${count}`;
    }
  };
}
