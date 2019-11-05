import { Slice, LinkedListNode } from '@glimmer/util';
import { Tag, Tagged, createCombinatorTag, CONSTANT_TAG } from '@glimmer/tag';

export function combineTagged(tagged: ReadonlyArray<Tagged>): Tag {
  let optimized: Tag[] = [];

  for (let i = 0, l = tagged.length; i < l; i++) {
    let tag = tagged[i].tag;
    if (tag === CONSTANT_TAG) continue;
    optimized.push(tag);
  }

  return createCombinatorTag(optimized);
}

export function combineSlice(slice: Slice<Tagged & LinkedListNode>): Tag {
  let optimized: Tag[] = [];

  let node = slice.head();

  while (node !== null) {
    let tag = node.tag;

    if (tag !== CONSTANT_TAG) optimized.push(tag);

    node = slice.nextNode(node);
  }

  return createCombinatorTag(optimized);
}
