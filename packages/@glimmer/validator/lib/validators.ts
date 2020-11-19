import { DEBUG } from '@glimmer/env';
import { scheduleRevalidate } from '@glimmer/global-context';
import { symbol, unwrap } from './utils';
import { assertTagNotConsumed } from './debug';

//////////

export type Revision = number;

export const CONSTANT: Revision = 0;
export const INITIAL: Revision = 1;
export const VOLATILE: Revision = NaN;

let $REVISION = INITIAL;

export function bump(): void {
  $REVISION++;
}

//////////

export const COMPUTE: unique symbol = symbol('TAG_COMPUTE');

export interface EntityTag<T> {
  [COMPUTE](): T;
}

export type Tag = EntityTag<Revision>;

//////////

/**
 * `value` receives a tag and returns an opaque Revision based on that tag. This
 * snapshot can then later be passed to `validate` with the same tag to
 * determine if the tag has changed at all since the time that `value` was
 * called.
 *
 * @param tag
 */
export function valueForTag(tag: Tag): Revision {
  return tag[COMPUTE]();
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
export function validateTag(tag: Tag, snapshot: Revision): boolean {
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

// this is basically a const
// eslint-disable-next-line @typescript-eslint/naming-convention
export let ALLOW_CYCLES: WeakMap<Tag, boolean> | undefined;

if (DEBUG) {
  ALLOW_CYCLES = new WeakMap();
}

function allowsCycles(tag: Tag): boolean {
  if (ALLOW_CYCLES === undefined) {
    return true;
  } else {
    return ALLOW_CYCLES.has(tag);
  }
}

interface MonomorphicTagBase<T extends MonomorphicTagTypes> extends Tag {
  [TYPE]: T;
}

export type DirtyableTag = MonomorphicTagBase<MonomorphicTagTypes.Dirtyable>;
export type UpdatableTag = MonomorphicTagBase<MonomorphicTagTypes.Updatable>;
export type CombinatorTag = MonomorphicTagBase<MonomorphicTagTypes.Combinator>;
export type ConstantTag = MonomorphicTagBase<MonomorphicTagTypes.Constant>;

class MonomorphicTagImpl<T extends MonomorphicTagTypes = MonomorphicTagTypes> {
  static combine(tags: Tag[]): Tag {
    switch (tags.length) {
      case 0:
        return CONSTANT_TAG;
      case 1:
        return tags[0];
      default:
        let tag: MonomorphicTagImpl = new MonomorphicTagImpl(MonomorphicTagTypes.Combinator);
        tag.subtag = tags;
        return tag;
    }
  }
  private revision = INITIAL;
  private lastChecked = INITIAL;
  private lastValue = INITIAL;

  private isUpdating = false;
  private subtag: Tag | Tag[] | null = null;
  private subtagBufferCache: Revision | null = null;

  [TYPE]: T;

  constructor(type: T) {
    this[TYPE] = type;
  }

  [COMPUTE](): Revision {
    let { lastChecked } = this;

    if (this.isUpdating === true) {
      if (DEBUG && !allowsCycles(this)) {
        throw new Error('Cycles in tags are not allowed');
      }

      this.lastChecked = ++$REVISION;
    } else if (lastChecked !== $REVISION) {
      this.isUpdating = true;
      this.lastChecked = $REVISION;

      try {
        let { subtag, revision } = this;

        if (subtag !== null) {
          if (Array.isArray(subtag)) {
            for (let i = 0; i < subtag.length; i++) {
              let value = subtag[i][COMPUTE]();
              revision = Math.max(value, revision);
            }
          } else {
            let subtagValue = subtag[COMPUTE]();

            if (subtagValue === this.subtagBufferCache) {
              revision = Math.max(revision, this.lastValue);
            } else {
              // Clear the temporary buffer cache
              this.subtagBufferCache = null;
              revision = Math.max(revision, subtagValue);
            }
          }
        }

        this.lastValue = revision;
      } finally {
        this.isUpdating = false;
      }
    }

    return this.lastValue;
  }

  static updateTag(_tag: UpdatableTag, _subtag: Tag) {
    if (DEBUG && _tag[TYPE] !== MonomorphicTagTypes.Updatable) {
      throw new Error('Attempted to update a tag that was not updatable');
    }

    // TODO: TS 3.7 should allow us to do this via assertion
    let tag = _tag as MonomorphicTagImpl;
    let subtag = _subtag as MonomorphicTagImpl;

    if (subtag === CONSTANT_TAG) {
      tag.subtag = null;
    } else {
      // There are two different possibilities when updating a subtag:
      //
      // 1. subtag[COMPUTE]() <= tag[COMPUTE]();
      // 2. subtag[COMPUTE]() > tag[COMPUTE]();
      //
      // The first possibility is completely fine within our caching model, but
      // the second possibility presents a problem. If the parent tag has
      // already been read, then it's value is cached and will not update to
      // reflect the subtag's greater value. Next time the cache is busted, the
      // subtag's value _will_ be read, and it's value will be _greater_ than
      // the saved snapshot of the parent, causing the resulting calculation to
      // be rerun erroneously.
      //
      // In order to prevent this, when we first update to a new subtag we store
      // its computed value, and then check against that computed value on
      // subsequent updates. If its value hasn't changed, then we return the
      // parent's previous value. Once the subtag changes for the first time,
      // we clear the cache and everything is finally in sync with the parent.
      tag.subtagBufferCache = subtag[COMPUTE]();
      tag.subtag = subtag;
    }
  }

  static dirtyTag(tag: DirtyableTag | UpdatableTag, disableConsumptionAssertion?: boolean) {
    if (
      DEBUG &&
      !(tag[TYPE] === MonomorphicTagTypes.Updatable || tag[TYPE] === MonomorphicTagTypes.Dirtyable)
    ) {
      throw new Error('Attempted to dirty a tag that was not dirtyable');
    }

    if (DEBUG && disableConsumptionAssertion !== true) {
      // Usually by this point, we've already asserted with better error information,
      // but this is our last line of defense.
      unwrap(assertTagNotConsumed)(tag);
    }

    (tag as MonomorphicTagImpl).revision = ++$REVISION;

    scheduleRevalidate();
  }
}

export const DIRTY_TAG = MonomorphicTagImpl.dirtyTag;
export const UPDATE_TAG = MonomorphicTagImpl.updateTag;

//////////

export function createTag(): DirtyableTag {
  return new MonomorphicTagImpl(MonomorphicTagTypes.Dirtyable);
}

export function createUpdatableTag(): UpdatableTag {
  return new MonomorphicTagImpl(MonomorphicTagTypes.Updatable);
}

//////////

export const CONSTANT_TAG: ConstantTag = new MonomorphicTagImpl(MonomorphicTagTypes.Constant);

export function isConstTag(tag: Tag): tag is ConstantTag {
  return tag === CONSTANT_TAG;
}

//////////

export class VolatileTag implements Tag {
  [COMPUTE](): Revision {
    return VOLATILE;
  }
}

export const VOLATILE_TAG = new VolatileTag();

//////////

export class CurrentTag implements CurrentTag {
  [COMPUTE](): Revision {
    return $REVISION;
  }
}

export const CURRENT_TAG = new CurrentTag();

//////////

export const combine = MonomorphicTagImpl.combine;

// Warm

let tag1 = createUpdatableTag();
let tag2 = createUpdatableTag();
let tag3 = createUpdatableTag();

valueForTag(tag1);
DIRTY_TAG(tag1);
valueForTag(tag1);
UPDATE_TAG(tag1, combine([tag2, tag3]));
valueForTag(tag1);
DIRTY_TAG(tag2);
valueForTag(tag1);
DIRTY_TAG(tag3);
valueForTag(tag1);
UPDATE_TAG(tag1, tag3);
valueForTag(tag1);
DIRTY_TAG(tag3);
valueForTag(tag1);
