import { Mixin } from '@ember/-internals/metal';
import Enumerable from './enumerable';
import MutableEnumerable from './mutable_enumerable';

type Value<T, K extends string> = K extends keyof T ? T[K] : unknown;

interface EmberArray<T> extends Enumerable {
  length: number;
  objectAt(idx: number): T | undefined;
  objectsAt(indexes: number[]): Array<T | undefined>;
  firstObject: T | undefined;
  lastObject: T | undefined;
  slice(beginIndex?: number, endIndex?: number): NativeArray<T>;
  indexOf(object: T, startAt?: number): number;
  lastIndexOf(object: T, startAt?: number): number;
  forEach<Target>(
    callback: (this: Target, item: T, index: number, arr: this) => void,
    target?: Target
  ): this;
  getEach<K extends string>(key: K): NativeArray<Value<T, K>>;
  setEach<K extends string>(key: K, value: Value<T, K>): this;
  map<U, Target>(
    callback: (this: Target, item: T, index: number, arr: this) => U,
    target?: Target
  ): NativeArray<U>;
  mapBy<K extends string>(key: K): NativeArray<Value<T, K>>;
  filter<Target>(
    callback: (this: Target, item: T, index: number, arr: this) => boolean,
    target?: Target
  ): NativeArray<T>;
  reject<Target>(
    callback: (this: Target, item: T, index: number, arr: this) => boolean,
    target?: Target
  ): NativeArray<T>;
  filterBy(key: string): NativeArray<T>;
  rejectBy(key: string): NativeArray<T>;
  find<Target = void>(
    callback: (this: Target, item: T, index: number, arr: this) => boolean,
    target?: Target
  ): T | undefined;
  findBy<K extends string>(key: K, value?: Value<T, K>): T | undefined;
  every<Target = void>(
    callback: (this: Target, item: T, index: number, arr: this) => boolean,
    target?: Target
  ): boolean;
  isEvery<K extends string>(key: K, value?: Value<T, K>): boolean;
  any<Target = void>(
    callback: (this: Target, item: T, index: number, arr: this) => boolean,
    target?: Target
  ): boolean;
  isAny<K extends string>(key: K, value?: Value<T, K>): boolean;
  reduce<V>(
    callback: (summation: V, current: T, index: number, arr: this) => V,
    initialValue?: V
  ): V;
  invoke<K extends string>(
    methodName: K,
    ...args: Value<T, K> extends (...args: any[]) => any ? Parameters<Value<T, K>> : unknown[]
  ): NativeArray<Value<T, K> extends (...args: any[]) => any ? ReturnType<Value<T, K>> : unknown>;
  toArray(): T[];
  compact(): NativeArray<Exclude<T, null>>;
  includes(object: T, startAt?: number): boolean;
  sortBy(key: string): T[];
  uniq(): NativeArray<T>;
  uniqBy(key: string): NativeArray<T>;
  without(value: T): NativeArray<T>;
}

declare const EmberArray: Mixin;
export default EmberArray;

interface MutableArray<T> extends EmberArray<T>, MutableEnumerable {
  replace(idx: number, amt: number, objects: T[]): void;
  clear(): this;
  insertAt(idx: number, object: T): this;
  removeAt(start: number, len: number): this;
  pushObject(obj: T): this;
  pushObjects(objects: T[]): this;
  popObject(): T | undefined;
  shiftObject(): T | null | undefined;
  unshiftObject(object: T): this;
  unshiftObjects(objects: T[]): this;
  reverseObjects(): this;
  setObjects(object: T[]): this;
  removeObject(object: T): this;
  removeObjects(objects: T[]): this;
  addObject(obj: T): this;
  addObjects(objects: T[]): this;
}

declare const MutableArray: Mixin;
export { MutableArray };

// NOTE: We have to Omit some definitions from Array because MutableArray defines them differently.
interface NativeArray<T>
  extends Omit<Array<T>, 'every' | 'filter' | 'find' | 'forEach' | 'map' | 'reduce' | 'slice'>,
    MutableArray<T> {}
declare const NativeArray: Array<unknown>;
export { NativeArray };

export function A<A>(arr: A): A extends Array<infer V> ? NativeArray<V> : NativeArray<unknown>;
export function A<T>(): NativeArray<T>;

export function removeAt<T>(array: T[] | EmberArray<T>, start: number, len: number): EmberArray<T>;
export function uniqBy<T>(array: T[], keyOrFunc: string | ((item: T) => unknown)): T[];
export function isArray(obj: unknown): boolean;
