import type { DeprecationOptions } from '@ember/debug';
import type Mixin from '@ember/object/mixin';

/** @internal */
export const DEPRECATION = Symbol('DEPRECATION');

/** @internal */
export function setDeprecation(
  mixin: Mixin,
  value: { message: string; options: DeprecationOptions } | null
) {
  mixin[DEPRECATION] = value;
}

let deprecationsEnabled = true;

export function findDeprecation(
  mixin: Mixin
): { message: string; options: DeprecationOptions } | null {
  if (!deprecationsEnabled) {
    return null;
  }
  if (mixin[DEPRECATION]) {
    return mixin[DEPRECATION];
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
