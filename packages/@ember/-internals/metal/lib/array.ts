import { EmberArray } from '@ember/-internals/utils';
import { arrayContentDidChange, arrayContentWillChange } from './array_events';

const EMPTY_ARRAY = Object.freeze([]);

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
  array: T[] | EmberArray<T>,
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
