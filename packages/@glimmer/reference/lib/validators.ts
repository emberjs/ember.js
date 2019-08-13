import { Slice, LinkedListNode, assert } from '@glimmer/util';
import { DEBUG } from '@glimmer/local-debug-flags';

//////////

// utils
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((
  k: infer I
) => void)
  ? I
  : never;

const symbol =
  typeof Symbol !== 'undefined'
    ? Symbol
    : (key: string) => `__${key}${Math.floor(Math.random() * Date.now())}__` as any;

//////////

export type Revision = number;

export const CONSTANT: Revision = 0;
export const INITIAL: Revision = 1;
export const VOLATILE: Revision = 9007199254740991; // MAX_INT

let $REVISION = INITIAL;

export function bump() {
  $REVISION++;
}

//////////

export const COMPUTE: unique symbol = symbol('TAG_COMPUTE');

export interface EntityTag<T> {
  [COMPUTE](): T;
}

export interface Tag extends EntityTag<Revision> {}

export interface EntityTagged<T> {
  tag: EntityTag<T>;
}

export interface Tagged {
  tag: Tag;
}

//////////

/**
 * `value` receives a tag and returns an opaque Revision based on that tag. This
 * snapshot can then later be passed to `validate` with the same tag to
 * determine if the tag has changed at all since the time that `value` was
 * called.
 *
 * The current implementation returns the global revision count directly for
 * performance reasons. This is an implementation detail, and should not be
 * relied on directly by users of these APIs. Instead, Revisions should be
 * treated as if they are opaque/unknown, and should only be interacted with via
 * the `value`/`validate` API.
 *
 * @param tag
 */
export function value(_tag: Tag): Revision {
  return $REVISION;
}

/**
 * `validate` receives a tag and a snapshot from a previous call to `value` with
 * the same tag, and determines if the tag is still valid compared to the
 * snapshot. If the tag's state has changed at all since then, `validate` will
 * return false, otherwise it will return true. This is used to determine if a
 * calculation related to the tags should be rerun.
 *
 * @param tag
 * @param snapshot
 */
export function validate(tag: Tag, snapshot: Revision) {
  return snapshot >= tag[COMPUTE]();
}

//////////

/**
 * This enum represents all of the possible tag types for the monomorphic tag class.
 * Other custom tag classes can exist, such as CurrentTag and VolatileTag, but for
 * performance reasons, any type of tag that is meant to be used frequently should
 * be added to the monomorphic tag.
 */
const enum MonomorphicTagTypes {
  Dirtyable,
  Updatable,
  Combinator,
  Constant,
}

const TYPE: unique symbol = symbol('TAG_TYPE');

export let ALLOW_CYCLES: WeakSet<UpdatableTag>;

if (DEBUG) {
  ALLOW_CYCLES = new WeakSet();
}

interface MonomorphicTagBase<T extends MonomorphicTagTypes> extends Tag {
  [TYPE]: T;
}

export interface DirtyableTag extends MonomorphicTagBase<MonomorphicTagTypes.Dirtyable> {}
export interface UpdatableTag extends MonomorphicTagBase<MonomorphicTagTypes.Updatable> {}
export interface CombinatorTag extends MonomorphicTagBase<MonomorphicTagTypes.Combinator> {}
export interface ConstantTag extends MonomorphicTagBase<MonomorphicTagTypes.Constant> {}

interface MonomorphicTagMapping {
  [MonomorphicTagTypes.Dirtyable]: DirtyableTag;
  [MonomorphicTagTypes.Updatable]: UpdatableTag;
  [MonomorphicTagTypes.Combinator]: CombinatorTag;
  [MonomorphicTagTypes.Constant]: ConstantTag;
}

type MonomorphicTag = UnionToIntersection<MonomorphicTagMapping[MonomorphicTagTypes]>;
type MonomorphicTagType = UnionToIntersection<MonomorphicTagTypes>;

export class MonomorphicTagImpl implements MonomorphicTag {
  private revision = INITIAL;
  private lastChecked = INITIAL;
  private lastValue = INITIAL;

  private isUpdating = false;
  private subtag: Tag | null = null;
  private subtags: Tag[] | null = null;

  [TYPE]: MonomorphicTagType;

  constructor(type: MonomorphicTagTypes) {
    this[TYPE] = type as MonomorphicTagType;
  }

  [COMPUTE](): Revision {
    let { lastChecked } = this;

    if (lastChecked !== $REVISION) {
      this.isUpdating = true;
      this.lastChecked = $REVISION;

      try {
        let { subtags, subtag, revision } = this;

        if (subtag !== null) {
          revision = Math.max(revision, subtag[COMPUTE]());
        }

        if (subtags !== null) {
          for (let i = 0; i < subtags.length; i++) {
            let value = subtags[i][COMPUTE]();
            revision = Math.max(value, revision);
          }
        }

        this.lastValue = revision;
      } finally {
        this.isUpdating = false;
      }
    }

    if (this.isUpdating === true) {
      if (DEBUG && !ALLOW_CYCLES.has(this)) {
        throw new Error('Cycles in tags are not allowed');
      }

      this.lastChecked = ++$REVISION;
    }

    return this.lastValue;
  }

  static update(_tag: UpdatableTag, subtag: Tag) {
    if (DEBUG) {
      assert(
        _tag[TYPE] === MonomorphicTagTypes.Updatable,
        'Attempted to update a tag that was not updatable'
      );
    }

    // TODO: TS 3.7 should allow us to do this via assertion
    let tag = _tag as MonomorphicTagImpl;

    if (subtag === CONSTANT_TAG) {
      tag.subtag = null;
    } else {
      tag.subtag = subtag;

      // subtag could be another type of tag, e.g. CURRENT_TAG or VOLATILE_TAG.
      // If so, lastChecked/lastValue will be undefined, result in these being
      // NaN. This is fine, it will force the system to recompute.
      tag.lastChecked = Math.min(tag.lastChecked, (subtag as any).lastChecked);
      tag.lastValue = Math.max(tag.lastValue, (subtag as any).lastValue);
    }
  }

  static dirty(tag: DirtyableTag | UpdatableTag) {
    if (DEBUG) {
      assert(
        tag[TYPE] === MonomorphicTagTypes.Updatable || tag[TYPE] === MonomorphicTagTypes.Dirtyable,
        'Attempted to dirty a tag that was not dirtyable'
      );
    }

    (tag as MonomorphicTagImpl).revision = ++$REVISION;
  }
}

export const dirty = MonomorphicTagImpl.dirty;
export const update = MonomorphicTagImpl.update;

//////////

export function createTag(): DirtyableTag {
  return new MonomorphicTagImpl(MonomorphicTagTypes.Dirtyable);
}

export function createUpdatableTag(): UpdatableTag {
  return new MonomorphicTagImpl(MonomorphicTagTypes.Updatable);
}

//////////

export const CONSTANT_TAG = new MonomorphicTagImpl(MonomorphicTagTypes.Constant) as ConstantTag;

export function isConst({ tag }: Tagged): boolean {
  return tag === CONSTANT_TAG;
}

export function isConstTag(tag: Tag): tag is ConstantTag {
  return tag === CONSTANT_TAG;
}

//////////

class VolatileTag implements Tag {
  [COMPUTE]() {
    return VOLATILE;
  }
}

export const VOLATILE_TAG = new VolatileTag();

//////////

class CurrentTag implements CurrentTag {
  [COMPUTE]() {
    return $REVISION;
  }
}

export const CURRENT_TAG = new CurrentTag();

//////////

export function combineTagged(tagged: ReadonlyArray<Tagged>): Tag {
  let optimized: Tag[] = [];

  for (let i = 0, l = tagged.length; i < l; i++) {
    let tag = tagged[i].tag;
    if (tag === CONSTANT_TAG) continue;
    optimized.push(tag);
  }

  return _combine(optimized);
}

export function combineSlice(slice: Slice<Tagged & LinkedListNode>): Tag {
  let optimized: Tag[] = [];

  let node = slice.head();

  while (node !== null) {
    let tag = node.tag;

    if (tag !== CONSTANT_TAG) optimized.push(tag);

    node = slice.nextNode(node);
  }

  return _combine(optimized);
}

export function combine(tags: Tag[]): Tag {
  let optimized: Tag[] = [];

  for (let i = 0, l = tags.length; i < l; i++) {
    let tag = tags[i];
    if (tag === CONSTANT_TAG) continue;
    optimized.push(tag);
  }

  return _combine(optimized);
}

function _combine(tags: Tag[]): Tag {
  switch (tags.length) {
    case 0:
      return CONSTANT_TAG;
    case 1:
      return tags[0];
    default:
      let tag = new MonomorphicTagImpl(MonomorphicTagTypes.Combinator) as CombinatorTag;
      (tag as any).subtags = tags;
      return tag;
  }
}
