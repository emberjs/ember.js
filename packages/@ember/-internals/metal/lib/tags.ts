import { isObject, setupMandatorySetter, symbol, toString } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { isDestroyed } from '@glimmer/runtime';
import { CONSTANT_TAG, dirtyTagFor, Tag, tagFor } from '@glimmer/validator';

/////////

export const CUSTOM_TAG_FOR = symbol('CUSTOM_TAG_FOR');

// This is exported for `@tracked`, but should otherwise be avoided. Use `tagForObject`.
export const SELF_TAG: string = symbol('SELF_TAG');

export function tagForProperty(
  obj: unknown,
  propertyKey: string | symbol,
  addMandatorySetter = false
): Tag {
  if (!isObject(obj)) {
    return CONSTANT_TAG;
  }

  if (typeof obj[CUSTOM_TAG_FOR] === 'function') {
    return obj[CUSTOM_TAG_FOR](propertyKey, addMandatorySetter);
  }

  let tag = tagFor(obj, propertyKey);

  if (DEBUG) {
    if (addMandatorySetter) {
      setupMandatorySetter!(tag, obj, propertyKey);
    }

    // TODO: Replace this with something more first class for tracking tags in DEBUG
    (tag as any)._propertyKey = propertyKey;
  }

  return tag;
}

export function tagForObject(obj: unknown | null): Tag {
  if (isObject(obj)) {
    if (DEBUG) {
      assert(
        isDestroyed(obj)
          ? `Cannot create a new tag for \`${toString(obj)}\` after it has been destroyed.`
          : '',
        !isDestroyed(obj)
      );
    }

    return tagFor(obj, SELF_TAG);
  }

  return CONSTANT_TAG;
}

export function markObjectAsDirty(obj: object, propertyKey: string): void {
  dirtyTagFor(obj, propertyKey);
  dirtyTagFor(obj, SELF_TAG);
}
