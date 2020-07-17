import { Tag, Tagged, createCombinatorTag, CONSTANT_TAG } from '@glimmer/validator';

/**
 * These utility functions are related to @glimmer/validator, but they aren't
 * meant to be consumed publicly. They exist as an optimization, and pull in
 * types that are otherwise unrelated to the validation system. Keeping them
 * here keeps the validation system isolated, and allows it to avoid pulling in
 * extra type information (which can lead to issues in public types).
 */

export function combineTagged(tagged: ReadonlyArray<Tagged>): Tag {
  let optimized: Tag[] = [];

  for (let i = 0; i < tagged.length; i++) {
    let tag = tagged[i].tag;
    if (tag === CONSTANT_TAG) continue;
    optimized.push(tag);
  }

  return createCombinatorTag(optimized);
}

export function combineFromIndex(tagged: ReadonlyArray<Tagged>, startIndex: number): Tag {
  let optimized: Tag[] = [];

  for (let i = startIndex; i < tagged.length; i++) {
    let tag = tagged[i].tag;
    if (tag === CONSTANT_TAG) continue;
    optimized.push(tag);
  }

  return createCombinatorTag(optimized);
}
