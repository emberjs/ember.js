import {
  Tag,
  CONSTANT_TAG,
  combine,
  TagWrapper,
  isConstTag,
  UpdatableDirtyableTag,
} from './validators';
import { Option } from '@glimmer/interfaces';
import { isObject } from '@glimmer/util';
import { EPOCH, getStateFor, setStateFor } from './tracked';

type Tags = Map<PropertyKey, TagWrapper<UpdatableDirtyableTag>>;
const TRACKED_TAGS = new WeakMap<object, Tags>();

export function tagFor<T extends object>(obj: T, key: keyof T): TagWrapper<UpdatableDirtyableTag>;
export function tagFor<T extends string | symbol | number | boolean | null | undefined>(
  obj: T,
  key: string
): TagWrapper<null>;
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

class Tracker {
  private tags = new Set<Tag>();
  private last: Option<Tag> = null;

  add(tag: Tag): void {
    this.tags.add(tag);
    this.last = tag;
  }

  get size(): number {
    return this.tags.size;
  }

  combine(): TagWrapper<UpdatableDirtyableTag> {
    if (this.tags.size === 0) {
      return UpdatableDirtyableTag.create(CONSTANT_TAG);
    } else if (this.tags.size === 1) {
      return UpdatableDirtyableTag.create(this.last!);
    } else {
      let tags: Tag[] = [];
      this.tags.forEach(tag => tags.push(tag));
      return UpdatableDirtyableTag.create(combine(tags));
    }
  }
}

function pushTrackFrame(): Option<Tracker> {
  let old = CURRENT_TRACKER;
  let tracker = new Tracker();

  CURRENT_TRACKER = tracker;
  return old;
}

function popTrackFrame(old: Option<Tracker>): TagWrapper<UpdatableDirtyableTag> {
  let tag = CURRENT_TRACKER!.combine();
  CURRENT_TRACKER = old;
  if (CURRENT_TRACKER) CURRENT_TRACKER.add(tag);
  return tag;
}

let CURRENT_TRACKER: Option<Tracker> = null;

export type Getter<T, K extends keyof T> = (self: T) => T[K] | undefined;
export type Setter<T, K extends keyof T> = (self: T, value: T[K]) => void;

export function accessor<T, K extends keyof T>({
  get,
  set,
  key,
}: {
  get: (this: T) => T[K];
  set?: (this: T, value: T[K]) => void;
  key: K;
}): { getter: Getter<T, K>; setter?: Setter<T, K> } {
  function getter(self: T) {
    let old = pushTrackFrame();

    let ret = get.call(self);

    let tag = popTrackFrame(old);
    updateTag(self, key, tag);

    return ret;
  }

  let setter: Setter<T, K> | undefined;

  if (set) {
    setter = function(self: T, value: T[K]) {
      EPOCH.inner.dirty();
      dirtyTag(self, key);

      set.call(self, value);
    };
  }

  return {
    getter,
    setter,
  };
}

export function data<T extends object, K extends keyof T>(
  key: K
): { getter: Getter<T, K>; setter?: Setter<T, K> } {
  function getter(self: T) {
    if (CURRENT_TRACKER) CURRENT_TRACKER.add(tagFor(self, key));
    return getStateFor(self, key);
  }

  function setter(self: T, value: T[K]): void {
    setStateFor(self, key, value);
  }

  return { getter, setter };
}
