import type { UpdatableTag } from '@glimmer/interfaces';

import { consumeTag, isTracking } from '../tracking';
import { createUpdatableTag, DIRTY_TAG } from '../validators';

/**
 * The per-key tags of a tracked collection.
 *
 * A `Map` has the same `get`, `set` and `delete` as a `WeakMap`,
 * so these helpers take either one.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type KeyTags = WeakMap<any, UpdatableTag>;

/**
 * Keys that a `WeakMap` can hold.
 *
 * A tag is created when a key is read, even when the collection doesn't have it.
 * Tags for these keys go in a `WeakMap`,
 * so that an object that was only looked up is not kept alive by the collection.
 *
 * Primitives can't be `WeakMap` keys, and they can't leak either.
 */
export function isWeakKey(key: unknown): key is object {
  return (typeof key === 'object' && key !== null) || typeof key === 'function';
}

/**
 * Picks the store for `key` in a `Set` or `Map`, which can hold any key.
 */
export function tagsFor(
  objectTags: KeyTags,
  primitiveTags: Map<unknown, UpdatableTag>,
  key: unknown
): KeyTags {
  return isWeakKey(key) ? objectTags : primitiveTags;
}

export function consumeKeyTag(tags: KeyTags, key: unknown): void {
  /**
   * Outside of a tracking frame nothing can be notified,
   * so there is no reason to create a tag.
   */
  if (!isTracking()) return;

  let tag = tags.get(key);

  if (tag === undefined) {
    tag = createUpdatableTag();
    tags.set(key, tag);
  }

  consumeTag(tag);
}

export function dirtyKeyTag(tags: KeyTags, key: unknown): void {
  const tag = tags.get(key);

  if (tag !== undefined) {
    DIRTY_TAG(tag);
  }
}

export function deleteKeyTag(tags: KeyTags, key: unknown): void {
  dirtyKeyTag(tags, key);
  tags.delete(key);
}

/**
 * Called with the keys of a `Set` or `Map` just before it is cleared.
 *
 * A `WeakMap` can't be enumerated,
 * so the tags of object keys are found through the keys being removed.
 */
export function clearKeyTags(
  objectTags: KeyTags,
  primitiveTags: Map<unknown, UpdatableTag>,
  keys: Iterable<unknown>
): void {
  for (const key of keys) {
    if (isWeakKey(key)) {
      deleteKeyTag(objectTags, key);
    }
  }

  primitiveTags.forEach((tag) => DIRTY_TAG(tag));
  primitiveTags.clear();
}
