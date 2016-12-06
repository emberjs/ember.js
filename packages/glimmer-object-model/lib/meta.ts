import { Dict, dict } from 'glimmer-util';
import { RevisionTag, DirtyableTag } from 'glimmer-reference';

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
