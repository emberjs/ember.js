import { arrayContentDidChange, arrayContentWillChange } from './array_events';
import { addListener, removeListener } from './events';

type ObservedArray<T> = T[] & ObservedObject;

interface ObservedObject {
  _revalidate?: () => void;
}

export { objectAt } from './object-at';

const CHUNK_SIZE = 60000;

// To avoid overflowing the stack, we splice up to CHUNK_SIZE items at a time.
// See https://code.google.com/p/chromium/issues/detail?id=56588 for more details.
export function replace<T>(
  array: T[],
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
  obj: ObservedArray<T>,
  eventName: string,
  target: object | Function | null,
  callbackName: string
) => void;

function arrayObserversHelper<T>(
  obj: ObservedArray<T>,
  target: object | Function | null,
  opts: ArrayObserverOptions,
  operation: Operation<T>
): ObservedArray<T> {
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
  array: T[],
  target: object | Function | null,
  opts: ArrayObserverOptions
): ObservedArray<T> {
  return arrayObserversHelper(array, target, opts, addListener);
}

export function removeArrayObserver<T>(
  array: T[],
  target: object | Function | null,
  opts: ArrayObserverOptions
): ObservedArray<T> {
  return arrayObserversHelper(array, target, opts, removeListener);
}
