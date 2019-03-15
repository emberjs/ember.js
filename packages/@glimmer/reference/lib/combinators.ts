import { VersionedPathReference, Tag, UpdatableDirtyableTag, TagWrapper, pair } from './validators';
import { property } from './property';
import { pushTrackFrame, popTrackFrame } from './autotrack';

export function map<T, U>(
  input: VersionedPathReference<T>,
  callback: (value: T) => U
): VersionedPathReference<U> {
  return new MapReference(input, callback);
}

class MapReference<T, U> implements VersionedPathReference<U> {
  readonly tag: Tag;
  readonly updatable: TagWrapper<UpdatableDirtyableTag> = UpdatableDirtyableTag.create();

  constructor(private inner: VersionedPathReference<T>, private callback: (value: T) => U) {
    this.tag = pair(inner.tag, this.updatable);
  }

  value(): U {
    let { inner, callback } = this;

    let old = pushTrackFrame();
    let ret = callback(inner.value());
    let tag = popTrackFrame(old);
    this.updatable.inner.update(tag);

    return ret;
  }

  get(key: string): VersionedPathReference {
    return property(this, key);
  }
}
