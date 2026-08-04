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

const TRACKED_TAGS = new WeakMap<object, TagMeta>();

/**
 * Read-only registry lookup: the canonical tag for (obj, key) if one
 * exists, with no create-on-miss allocation.
 */
export function peekTagFor(obj: object, key: PropertyKey): UpdatableTag | undefined {
  return TRACKED_TAGS.get(obj)?.get(key);
}

/**
 * Adopts an externally-owned tag (e.g. a tracked field's inline cell
 * tag) as THE tag for (obj, key) in the central registry, so
 * `tagFor`/`dirtyTagFor` consumers -- notifyPropertyChange, computed
 * property chains -- observe the same tag object the field itself
 * consumes and dirties.
 */
export function registerTagFor(obj: object, key: PropertyKey, tag: UpdatableTag): void {
  let tags = TRACKED_TAGS.get(obj);

  if (tags === undefined) {
    tags = new Map();
    TRACKED_TAGS.set(obj, tags);
  }

  tags.set(key, tag);
}

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
      unwrap(debug.assertTagNotConsumed)(propertyTag, obj, key);
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
