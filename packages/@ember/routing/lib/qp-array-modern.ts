/*
  Build-level replacement for `qp-array.ts` in variants without the classic
  object model: array-valued query params stay plain arrays.
*/
export function makeQPArray<T>(array: T[]): T[] {
  return array;
}
