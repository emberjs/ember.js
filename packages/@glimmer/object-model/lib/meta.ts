import { Opaque, Dict, dict } from '@glimmer/util';
import { Tag, DirtyableTag } from '@glimmer/reference';
import { Computed } from './blueprint';

export default class {
  bookkeeping: Dict<Tag> = dict<Tag>();

  tag(name: PropertyKey): Tag {
    let bookkeeping = this.bookkeeping;
    let tag = bookkeeping[name];

    if (tag === undefined) {
      tag = DirtyableTag.create();
      bookkeeping[name] = tag;
    }

    return tag;
  }

  dirty(name: PropertyKey) {
    let tag = this.tag(name).inner as DirtyableTag;
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
