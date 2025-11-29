import type EmberArray from '@ember/array';
import { disableDeprecations } from '@ember/array/-internals';

export function objectAt<T>(array: T[] | EmberArray<T>, index: number): T | undefined {
  if (Array.isArray(array)) {
    return array[index];
  } else {
    return disableDeprecations(() => array.objectAt(index));
  }
}
