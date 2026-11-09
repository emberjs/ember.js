/*
  The default order for `sortBy` and the `sort` computed macro.

  - `undefined` first, then `null`
  - strings, numbers, booleans and dates by value
  - any other pair keeps its order
*/
export default function sortCompare(a: unknown, b: unknown): number {
  if (a === b) {
    return 0;
  }

  if (a === undefined) {
    return -1;
  }

  if (b === undefined) {
    return 1;
  }

  if (a === null) {
    return -1;
  }

  if (b === null) {
    return 1;
  }

  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  return 0;
}
