/**
 * Marks a value produced by the `-each-in` keyword so the iterator yields
 * keys and values. Kept apart from the helper so the default iterator does
 * not pull in the helper's dependencies.
 */
export class EachInWrapper {
  constructor(public inner: unknown) {}
}
