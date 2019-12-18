import { DEBUG } from '@glimmer/env';
import { dirty, createUpdatableTag, UpdatableTag, CONSTANT_TAG, ConstantTag } from './validators';
import { assertTagNotConsumed } from './debug';

export let propertyDidChange = function() {};

export function setPropertyDidChange(cb: () => void) {
  propertyDidChange = cb;
}

function isObject<T>(u: T): u is object & T {
  return (typeof u === 'object' && u !== null) || typeof u === 'function';
}

///////////

type Tags = Map<PropertyKey, UpdatableTag>;

const TRACKED_TAGS = new WeakMap<object, Tags>();

export function dirtyTagFor<T>(obj: T, key: keyof T | string | symbol): void {
  if (isObject(obj)) {
    let tags = TRACKED_TAGS.get(obj);

    // No tags have been setup for this object yet, return
    if (tags === undefined) return;

    // Dirty the tag for the specific property if it exists
    let propertyTag = tags.get(key);

    if (propertyTag !== undefined) {
      if (DEBUG) {
        assertTagNotConsumed!(propertyTag, obj, key);
      }

      dirty(propertyTag);
      propertyDidChange();
    }
  } else {
    throw new Error(`BUG: Can't update a tag for a primitive`);
  }
}

export function tagFor<T>(obj: T, key: keyof T | string | symbol): UpdatableTag | ConstantTag {
  if (isObject(obj)) {
    let tags = TRACKED_TAGS.get(obj);

    if (tags === undefined) {
      tags = new Map();

      TRACKED_TAGS.set(obj, tags);
    } else if (tags.has(key)) {
      return tags.get(key)!;
    }

    let tag = createUpdatableTag();
    tags.set(key, tag);

    return tag;
  } else {
    return CONSTANT_TAG;
  }
}
