/**
@module ember
*/
import { tagForProperty } from '@ember/-internals/metal';
import { isObject } from '@ember/-internals/utils';
import { VMArguments } from '@glimmer/interfaces';
import { PathReference } from '@glimmer/reference';
import { consumeTag } from '@glimmer/validator';

/**
  This reference is used to get the `[]` tag of iterables, so we can trigger
  updates to `{{each}}` when it changes. It is put into place by a template
  transform at build time, similar to the (-each-in) helper
*/
class TrackArrayReference implements PathReference {
  constructor(private inner: PathReference) {}

  isConst() {
    return this.inner.isConst();
  }

  value(): unknown {
    let iterable = this.inner.value();

    if (isObject(iterable)) {
      consumeTag(tagForProperty(iterable, '[]'));
    }

    return iterable;
  }

  get(key: string): PathReference {
    return this.inner.get(key);
  }
}

export default function trackArray(args: VMArguments) {
  return new TrackArrayReference(args.positional.at(0));
}
