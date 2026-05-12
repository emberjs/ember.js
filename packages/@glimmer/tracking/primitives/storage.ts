/**
 * https://rfcs.emberjs.com/id/0669-tracked-storage-primitive
 *
 * See, in particular:
 *  https://rfcs.emberjs.com/id/0669-tracked-storage-primitive#re-implementing-tracked-with-storage
 *
 * This was an earlier iteration of "Cells" from starbeam.
 *
 * Ultimately, these functions could (and maybe should)
 * be re-exports from Glimmer and/or Starbeam
 */

export function createStorage<T>(
  initialValue?: T,
  isEqual?: (oldValue: T, newValue: T) => boolean
): Storage<T> {
  throw new Error('Not Implemented');
}

/**
 * This function receives a tracked storage instance, and returns the value it contains, consuming it so that it entangles with any currently active autotracking contexts.
 */
export function getValue<T>(storage: Storage<T>): T {
  throw new Error('Not Implemented');
}

/**
 * This function receives a tracked storage instance and a value, and sets the value of the tracked storage to the passed value if it is not equal to the previous value. If the value is set, it will dirty the storage, causing any tracked computations which consumed the stored value to recompute. If the value was not changed, then it does not set the value or dirty it.
 */
export function setValue<T>(storage: Storage<T>, value: T): void {
  throw new Error('Not Implemented');
}
