import { Opaque, Dict, dict } from 'glimmer-util';
import { RevisionTag, DirtyableTag } from 'glimmer-reference';
import { Computed } from './blueprint';

export default class {
  bookkeeping: Dict<DirtyableTag> = dict<DirtyableTag>();

  tag(name: PropertyKey): RevisionTag {
    let bookkeeping = this.bookkeeping;
    let tag = bookkeeping[name];

    if (tag === undefined) {
      tag = new DirtyableTag();
      bookkeeping[name] = tag;
    }

    return tag;
  }

  dirty(name: PropertyKey) {
    let tag = this.tag(name) as DirtyableTag;
    tag.dirty();
  }
}

export class ClassMeta {
  private computed: Dict<Computed<Opaque>> = dict<Computed<Opaque>>();

  defineComputed(name: PropertyKey, value: Computed<Opaque>) {
    this.computed[name] = value;
  }

  getComputed(name: PropertyKey): Computed<Opaque> {
    return this.computed[name];
  }
}