import { DEBUG } from '@glimmer/env';
import type { Tag } from '@glimmer/interfaces';

import type { Indexable } from './utils';

import { debug } from './debug';
import { unwrap } from './utils';
import { createTag, dirtyTag, releaseTag } from './tags';

function isObjectLike<T>(u: T): u is Indexable & T {
  return (typeof u === 'object' && u !== null) || typeof u === 'function';
}

///////////

export type TagMeta = Map<PropertyKey, Tag>;

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
      unwrap(debug.assertTagNotConsumed)(propertyTag, obj, key);
    }

    dirtyTag(propertyTag, true);
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
): Tag {
  let tags = meta === undefined ? tagMetaFor(obj) : meta;
  let tag = tags.get(key);

  if (tag === undefined) {
    tag = createTag();
    tags.set(key, tag);
  }

  return tag;
}

/**
 * Call this function when `obj` will get no more reads.
 *
 * A tag of `obj` that follows other tags has links from those tags. The links
 * keep memory, and each write to those tags visits them.
 */
export function releaseTagsFor(obj: object): void {
  let tags = TRACKED_TAGS.get(obj);

  if (tags !== undefined) {
    tags.forEach(releaseTag);
  }
}
