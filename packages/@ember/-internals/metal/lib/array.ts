import { Array as EmberArray, MutableArray, NativeArray } from '@ember/-internals/runtime';
import { arrayContentDidChange, arrayContentWillChange } from './array_events';
import { addListener, removeListener } from './events';

const EMPTY_ARRAY = Object.freeze([]);

interface ObservedObject<T> extends EmberArray<T> {
  _revalidate?: () => void;
}

export function objectAt<T>(array: T[] | EmberArray<T>, index: number): T | undefined {
  if (Array.isArray(array)) {
    return array[index];
  } else {
    return array.objectAt(index);
  }
}

export function replace<T>(
  array: NativeArray<T> | MutableArray<T>,
  start: number,
  deleteCount: number,
  items = EMPTY_ARRAY
): void {
  if (Array.isArray(array)) {
    replaceInNativeArray(array, start, deleteCount, items);
  } else {
    array.replace(start, deleteCount, items as any);
  }
}

const CHUNK_SIZE = 60000;

// To avoid overflowing the stack, we splice up to CHUNK_SIZE items at a time.
// See https://code.google.com/p/chromium/issues/detail?id=56588 for more details.
export function replaceInNativeArray<T>(
  array: T[] | NativeArray<T>,
  start: number,
  deleteCount: number,
  items: ReadonlyArray<T>
): void {
  arrayContentWillChange(array, start, deleteCount, items.length);

  if (items.length <= CHUNK_SIZE) {
    array.splice(start, deleteCount, ...items);
  } else {
    array.splice(start, deleteCount);

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      let chunk = items.slice(i, i + CHUNK_SIZE);
      array.splice(start + i, 0, ...chunk);
    }
  }

  arrayContentDidChange(array, start, deleteCount, items.length);
}

interface ArrayObserverOptions {
  willChange: string;
  didChange: string;
}

type Operation<T> = (
  obj: ObservedObject<T>,
  eventName: string,
  target: object | Function | null,
  callbackName: string
) => void;

function arrayObserversHelper<T>(
  obj: ObservedObject<T>,
  target: object | Function | null,
  opts: ArrayObserverOptions,
  operation: Operation<T>
): ObservedObject<T> {
  let { willChange, didChange } = opts;

  operation(obj, '@array:before', target, willChange);
  operation(obj, '@array:change', target, didChange);

  /*
   * Array proxies have a `_revalidate` method which must be called to set
   * up their internal array observation systems.
   */
  obj._revalidate?.();

  return obj;
}

export function addArrayObserver<T>(
  array: EmberArray<T>,
  target: object | Function | null,
  opts: ArrayObserverOptions
): ObservedObject<T> {
  return arrayObserversHelper(array, target, opts, addListener);
}

export function removeArrayObserver<T>(
  array: EmberArray<T>,
  target: object | Function | null,
  opts: ArrayObserverOptions
): ObservedObject<T> {
  return arrayObserversHelper(array, target, opts, removeListener);
}
