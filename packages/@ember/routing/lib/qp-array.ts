import { A as emberA } from '@ember/array';

/*
  Array-valued query params (default values and deserialized values) are
  wrapped as EmberArrays so classic apps can use observable array methods on
  them. Builds without the classic object model swap this module for
  `qp-array-modern.ts`, which returns the plain array.
*/
export function makeQPArray<T>(array: T[]): T[] {
  return emberA(array) as unknown as T[];
}
