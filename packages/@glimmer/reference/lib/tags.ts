import { isObject } from '@glimmer/util';
import { TagWrapper, UpdatableDirtyableTag, CONSTANT_TAG, isConstTag } from './validators';

type Tags = Map<PropertyKey, TagWrapper<UpdatableDirtyableTag>>;
const TRACKED_TAGS = new WeakMap<object, Tags>();

export function dirtyTag<T>(obj: T, key: keyof T): void {
  if (isObject(obj)) {
    let tag = tagFor(obj, key);

    if (tag === undefined) {
      updateTag(obj, key, UpdatableDirtyableTag.create(CONSTANT_TAG));
    } else if (isConstTag(tag)) {
      throw new Error(`BUG: Can't update a constant tag`);
    } else {
      tag.inner.dirty();
    }
  } else {
    throw new Error(`BUG: Can't update a tag for a primitive`);
  }
}

export function tagFor<T extends object>(obj: T, key: keyof T): TagWrapper<UpdatableDirtyableTag>;
export function tagFor<T>(obj: T, key: string): TagWrapper<null>;
export function tagFor<T>(
  obj: T,
  key: keyof T
): TagWrapper<UpdatableDirtyableTag> | TagWrapper<null> {
  if (isObject(obj)) {
    let tags = TRACKED_TAGS.get(obj);

    if (tags === undefined) {
      tags = new Map();
      TRACKED_TAGS.set(obj, tags);
    } else if (tags.has(key)) {
      return tags.get(key)!;
    }

    let tag = UpdatableDirtyableTag.create(CONSTANT_TAG);
    tags.set(key, tag);
    return tag;
  } else {
    return CONSTANT_TAG;
  }
}

export function updateTag<T>(
  obj: T,
  key: keyof T,
  newTag: TagWrapper<UpdatableDirtyableTag>
): TagWrapper<UpdatableDirtyableTag> {
  if (isObject(obj)) {
    let tag = tagFor(obj, key);

    if (isConstTag(tag)) {
      throw new Error(`BUG: Can't update a constant tag`);
    } else {
      tag.inner.update(newTag);
    }

    return tag;
  } else {
    throw new Error(`BUG: Can't update a tag for a primitive`);
  }
}
