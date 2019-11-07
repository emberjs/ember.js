import {
  dirty,
  update,
  createUpdatableTag,
  UpdatableTag,
  CONSTANT_TAG,
  isConstTag,
  ConstantTag,
} from './validators';

type Tags = Map<PropertyKey, UpdatableTag>;
const TRACKED_TAGS = new WeakMap<object, Tags>();

function isObject<T>(u: T): u is object & T {
  return typeof u === 'object' && u !== null;
}

export function dirtyTag<T>(obj: T, key: keyof T): void {
  if (isObject(obj)) {
    let tag = tagFor(obj, key);

    if (tag === undefined) {
      updateTag(obj, key, createUpdatableTag());
    } else if (isConstTag(tag)) {
      throw new Error(`BUG: Can't update a constant tag`);
    } else {
      dirty(tag);
    }
  } else {
    throw new Error(`BUG: Can't update a tag for a primitive`);
  }
}

export function tagFor<T extends object>(obj: T, key: keyof T): UpdatableTag;
export function tagFor<T>(obj: T, key: string): ConstantTag;
export function tagFor<T>(obj: T, key: keyof T): UpdatableTag | ConstantTag {
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

export function updateTag<T>(obj: T, key: keyof T, newTag: UpdatableTag): UpdatableTag {
  if (isObject(obj)) {
    let tag = tagFor(obj, key);

    if (isConstTag(tag)) {
      throw new Error(`BUG: Can't update a constant tag`);
    } else {
      update(tag, newTag);
    }

    return tag;
  } else {
    throw new Error(`BUG: Can't update a tag for a primitive`);
  }
}
