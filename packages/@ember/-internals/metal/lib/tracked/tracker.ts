import { combine, CONSTANT_TAG, Tag } from '@glimmer/reference';
import { Option } from './types';

/**
  An object that that tracks @tracked properties that were consumed.

  @private
*/
export class Tracker {
  private tags = new Set<Tag>();
  private last: Option<Tag> = null;

  add(tag: Tag): void {
    this.tags.add(tag);
    this.last = tag;
  }

  get size(): number {
    return this.tags.size;
  }

  combine(): Tag {
    if (this.tags.size === 0) {
      return CONSTANT_TAG;
    } else if (this.tags.size === 1) {
      return this.last as Tag;
    } else {
      let tags: Tag[] = [];
      this.tags.forEach(tag => tags.push(tag));
      return combine(tags);
    }
  }
}
