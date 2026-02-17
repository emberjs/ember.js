import type { DeprecationObject } from '@ember/-internals/deprecations';
import type Mixin from '@ember/object/mixin';

/** @internal */
export const DEPRECATION = Symbol('DEPRECATION');

/** @internal */
export function setDeprecation(
  mixin: Mixin,
  value: { message: string; deprecation: DeprecationObject } | null
) {
  // SAFETY: Using symbol as index on Mixin - this is internal deprecated API tooling
  (mixin as any)[DEPRECATION] = value;
}

let deprecationsEnabled = true;

export function findDeprecation(
  mixin: Mixin
): { message: string; deprecation: DeprecationObject } | null {
  if (!deprecationsEnabled) {
    return null;
  }
  // SAFETY: Using symbol as index on Mixin - this is internal deprecated API tooling
  if ((mixin as any)[DEPRECATION]) {
    return (mixin as any)[DEPRECATION];
  }
  for (let childMixin of mixin.mixins ?? []) {
    let deprecation = findDeprecation(childMixin);
    if (deprecation) {
      return deprecation;
    }
  }
  return null;
}

export function disableDeprecations<T>(callback: () => T): T {
  try {
    deprecationsEnabled = false;
    return callback();
  } finally {
    deprecationsEnabled = true;
  }
}
