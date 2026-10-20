import { DEBUG } from '@glimmer/env';
import type { ConstantTag, UpdatableTag } from '@glimmer/interfaces';

import type { Indexable } from './utils';

import { debug } from './debug';
import { unwrap } from './utils';
import { createUpdatableTag, DIRTY_TAG } from './validators';

function isObjectLike<T>(u: T): u is Indexable & T {
  return (typeof u === 'object' && u !== null) || typeof u === 'function';
}

///////////

export type TagMeta = Map<PropertyKey, UpdatableTag>;

/**
 * A map from a key to its tag.
 *
 * The registry keeps a `Map` for each object.
 * A tracked collection passes its own `Map` or `WeakMap`,
 * so its keys can be any value.
 */
export interface TagStore<Key> {
  get(key: Key): UpdatableTag | undefined;
  set(key: Key, tag: UpdatableTag): unknown;
}

const TRACKED_TAGS = new WeakMap<object, TagMeta>();

export function dirtyTagFor<T extends object, Key = keyof T | string | symbol>(
  obj: T,
  key: Key,
  meta?: TagStore<Key>
): void {
  if (DEBUG && !isObjectLike(obj)) {
    throw new Error(`BUG: Can't update a tag for a primitive`);
  }

  let tags = meta === undefined ? (TRACKED_TAGS.get(obj) as TagStore<Key> | undefined) : meta;

  // No tags have been setup for this object yet, return
  if (tags === undefined) return;

  // Dirty the tag for the specific property if it exists
  let propertyTag = tags.get(key);

  if (propertyTag !== undefined) {
    if (DEBUG) {
      unwrap(debug.assertTagNotConsumed)(propertyTag, obj, key as keyof T);
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

export function tagFor<T extends object, Key = keyof T | string | symbol>(
  obj: T,
  key: Key,
  meta?: TagStore<Key>
): UpdatableTag | ConstantTag {
  let tags = meta === undefined ? (tagMetaFor(obj) as TagStore<Key>) : meta;
  let tag = tags.get(key);

  if (tag === undefined) {
    tag = createUpdatableTag();
    tags.set(key, tag);
  }

  return tag;
}
