/**
@module ember
*/
import { tagForProperty } from '@ember/-internals/metal';
import { VMArguments } from '@glimmer/interfaces';
import { VersionedPathReference } from '@glimmer/reference';
import { combine, createUpdatableTag, Tag, update } from '@glimmer/validator';

/**
  This reference is used to get the `[]` tag of iterables, so we can trigger
  updates to `{{each}}` when it changes. It is put into place by a template
  transform at build time, similar to the (-each-in) helper
*/
class TrackArrayReference implements VersionedPathReference {
  public tag: Tag;
  private valueTag = createUpdatableTag();

  constructor(private inner: VersionedPathReference) {
    this.tag = combine([inner.tag, this.valueTag]);
  }

  value(): unknown {
    let iterable = this.inner.value();

    let tag = tagForProperty(iterable, '[]');

    update(this.valueTag, tag);

    return iterable;
  }

  get(key: string): VersionedPathReference {
    return this.inner.get(key);
  }
}

export default function trackArray(args: VMArguments) {
  return new TrackArrayReference(args.positional.at(0));
}
