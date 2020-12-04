import { isObject, setupMandatorySetter, symbol, toString } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { isDestroyed } from '@glimmer/destroyable';
import { DEBUG } from '@glimmer/env';
import { CUSTOM_TAG_FOR } from '@glimmer/manager';
import { CONSTANT_TAG, dirtyTagFor, Tag, tagFor, TagMeta } from '@glimmer/validator';

/////////

// This is exported for `@tracked`, but should otherwise be avoided. Use `tagForObject`.
export const SELF_TAG: string | symbol = symbol('SELF_TAG');

export function tagForProperty(
  obj: object,
  propertyKey: string | symbol,
  addMandatorySetter = false,
  meta?: TagMeta
): Tag {
  if (typeof obj[CUSTOM_TAG_FOR] === 'function') {
    return obj[CUSTOM_TAG_FOR](propertyKey, addMandatorySetter);
  }

  let tag = tagFor(obj, propertyKey, meta);

  if (DEBUG && addMandatorySetter) {
    setupMandatorySetter!(tag, obj, propertyKey);
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
