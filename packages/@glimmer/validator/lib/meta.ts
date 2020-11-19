import { DEBUG } from '@glimmer/env';
import { DIRTY_TAG, createUpdatableTag, UpdatableTag, ConstantTag } from './validators';
import { assertTagNotConsumed } from './debug';
import { Indexable, unwrap } from './utils';

function isObjectLike<T>(u: T): u is Indexable & T {
  return (typeof u === 'object' && u !== null) || typeof u === 'function';
}

///////////

export type TagMeta = Map<PropertyKey, UpdatableTag>;

const TRACKED_TAGS = new WeakMap<object, TagMeta>();

export function dirtyTagFor<T extends object>(
  obj: T,
  key: keyof T | string | symbol,
  meta?: TagMeta
): void {
  if (DEBUG && !isObjectLike(obj)) {
    throw new Error(`BUG: Can't update a tag for a primitive`);
  }

  let tags = meta === undefined ? TRACKED_TAGS.get(obj) : meta;

  // No tags have been setup for this object yet, return
  if (tags === undefined) return;

  // Dirty the tag for the specific property if it exists
  let propertyTag = tags.get(key);

  if (propertyTag !== undefined) {
    if (DEBUG) {
      unwrap(assertTagNotConsumed)(propertyTag, obj, key);
    }

    DIRTY_TAG(propertyTag, true);
  }
}

export function tagMetaFor(obj: object): TagMeta {
  let tags = TRACKED_TAGS.get(obj);

  if (tags === undefined) {
    tags = new Map();

    TRACKED_TAGS.set(obj, tags);
  }

  return tags;
}

export function tagFor<T extends object>(
  obj: T,
  key: keyof T | string | symbol,
  meta?: TagMeta
): UpdatableTag | ConstantTag {
  let tags = meta === undefined ? tagMetaFor(obj) : meta;
  let tag = tags.get(key);

  if (tag === undefined) {
    tag = createUpdatableTag();
    tags.set(key, tag);
  }

  return tag;
}
