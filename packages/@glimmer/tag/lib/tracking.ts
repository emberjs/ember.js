import { Tag, combine, update, UpdatableTag, createUpdatableTag } from './tags';
import { getStateFor, setStateFor } from './property-meta';
import { tagFor } from './object-meta';

type Option<T> = T | null;

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

  combine(): UpdatableTag {
    let { tags } = this;
    let tag = createUpdatableTag();

    if (tags.size === 1) {
      update(tag, this.last!);
    } else if (tags.size > 1) {
      let tags: Tag[] = [];
      this.tags.forEach(tag => tags.push(tag));

      update(tag, combine(tags));
    }

    return tag;
  }
}

export function pushTrackFrame(): Option<Tracker> {
  let old = CURRENT_TRACKER;
  let tracker = new Tracker();

  CURRENT_TRACKER = tracker;
  return old;
}

export function popTrackFrame(old: Option<Tracker>): UpdatableTag {
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
