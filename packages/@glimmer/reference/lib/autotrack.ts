import { Tag, CONSTANT_TAG, combine, TagWrapper, UpdatableDirtyableTag } from './validators';
import { Option } from '@glimmer/interfaces';
import { getStateFor, setStateFor } from './tracked';
import { tagFor } from './tags';

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

export function pushTrackFrame(): Option<Tracker> {
  let old = CURRENT_TRACKER;
  let tracker = new Tracker();

  CURRENT_TRACKER = tracker;
  return old;
}

export function popTrackFrame(old: Option<Tracker>): TagWrapper<UpdatableDirtyableTag> {
  let tag = CURRENT_TRACKER!.combine();
  CURRENT_TRACKER = old;
  if (CURRENT_TRACKER) CURRENT_TRACKER.add(tag);
  return tag;
}

let CURRENT_TRACKER: Option<Tracker> = null;

export type Getter<T, K extends keyof T> = (self: T) => T[K] | undefined;
export type Setter<T, K extends keyof T> = (self: T, value: T[K]) => void;

export function trackedData<T extends object, K extends keyof T>(
  key: K
): { getter: Getter<T, K>; setter: Setter<T, K> } {
  function getter(self: T) {
    if (CURRENT_TRACKER) CURRENT_TRACKER.add(tagFor(self, key));
    return getStateFor(self, key);
  }

  function setter(self: T, value: T[K]): void {
    setStateFor(self, key, value);
  }

  return { getter, setter };
}
