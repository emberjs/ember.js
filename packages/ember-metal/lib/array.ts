import { arrayContentDidChange, arrayContentWillChange } from './array_events';
import { addListener, removeListener } from './events';
import { notifyPropertyChange } from './property_events';
import { get } from './property_get';

const EMPTY_ARRAY = Object.freeze([]);

interface ObjectHasArrayObservers {
  hasArrayObservers?: boolean;
}

interface EmberArray<T> extends ObjectHasArrayObservers {
  length: number;
  objectAt(index: number): T | undefined;
  replace(start: number, deleteCount: number, items: T[]): void;
  splice(start: number, deleteCount: number, ...items: T[]): void;
}

export function objectAt<T>(array: T[] | EmberArray<T>, index: number): T | undefined {
  if (Array.isArray(array)) {
    return array[index];
  } else {
    return array.objectAt(index);
  }
}

export function replace<T>(
  array: T[] | EmberArray<T>,
  start: number,
  deleteCount: number,
  items = EMPTY_ARRAY
) {
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
  array: T[] | EmberArray<T>,
  start: number,
  deleteCount: number,
  items: ReadonlyArray<T>
) {
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
  willChange?: string;
  didChange?: string;
}

type Operation = (
  obj: ObjectHasArrayObservers,
  eventName: string,
  target: object | Function | null,
  callbackName: string
) => void;

function arrayObserversHelper(
  obj: ObjectHasArrayObservers,
  target: object | Function | null,
  opts: ArrayObserverOptions | undefined,
  operation: Operation,
  notify: boolean
) {
  let willChange = (opts && opts.willChange) || 'arrayWillChange';
  let didChange = (opts && opts.didChange) || 'arrayDidChange';
  let hasObservers = get(obj, 'hasArrayObservers');

  operation(obj, '@array:before', target, willChange);
  operation(obj, '@array:change', target, didChange);

  if (hasObservers === notify) {
    notifyPropertyChange(obj, 'hasArrayObservers');
  }

  return obj;
}

export function addArrayObserver<T>(
  array: EmberArray<T>,
  target: any,
  opts?: ArrayObserverOptions | undefined
) {
  return arrayObserversHelper(array, target, opts, addListener, false);
}

export function removeArrayObserver<T>(
  array: EmberArray<T>,
  target: any,
  opts?: ArrayObserverOptions | undefined
) {
  return arrayObserversHelper(array, target, opts, removeListener, true);
}
