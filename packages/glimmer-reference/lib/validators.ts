import Reference, { PathReference } from './reference';
import { InternedString, Opaque, Slice, LinkedListNode } from 'glimmer-util';

//////////

export interface EntityTag<T> extends Reference<T> {
  value(): T;
  validate(snapshot: T);
}

export interface Tagged<T> {
  tag: EntityTag<T>;
}

//////////

export type Revision = number;

export const CONSTANT: Revision = 0;
export const INITIAL:  Revision = 1;
export const VOLATILE: Revision = NaN;

export abstract class RevisionTag implements RevisionTag {
  abstract value(): Revision;

  validate(snapshot: Revision): boolean {
    return this.value() === snapshot;
  }
}

let $REVISION = INITIAL;

export class DirtyableTag extends RevisionTag {
  private revision: Revision;

  constructor(revision = $REVISION) {
    super();
    this.revision = revision;
  }

  value(): Revision {
    return this.revision;
  }

  dirty() {
    this.revision = ++$REVISION;
  }
}

export function combineTagged(tagged: Tagged<Revision>[]): RevisionTag {
  let optimized = [];

  for (let i=0, l=tagged.length; i<l; i++) {
    let tag = tagged[i].tag;
    if (tag === VOLATILE_TAG) return VOLATILE_TAG;
    if (tag === CONSTANT_TAG) continue;
    optimized.push(tag);
  }

  return _combine(optimized);
}

export function combineSlice(slice: Slice<Tagged<Revision> & LinkedListNode>): RevisionTag {
  let optimized = [];

  let node = slice.head();

  while(node !== null) {
    let tag = node.tag;

    if (tag === VOLATILE_TAG) return VOLATILE_TAG;
    if (tag !== CONSTANT_TAG) optimized.push(tag);

    node = slice.nextNode(node);
  }

  return _combine(optimized);
}

export function combine(tags: RevisionTag[]): RevisionTag {
  let optimized = [];

  for (let i=0, l=tags.length; i<l; i++) {
    let tag = tags[i];
    if (tag === VOLATILE_TAG) return VOLATILE_TAG;
    if (tag === CONSTANT_TAG) continue;
    optimized.push(tag);
  }

  return _combine(optimized);
}

function _combine(tags: RevisionTag[]): RevisionTag {
  switch (tags.length) {
    case 0:
      return CONSTANT_TAG;
    case 1:
      return tags[0];
    case 2:
      return new TagsPair(tags[0], tags[1]);
    default:
      return new TagsCombinator(tags);
  };
}

export abstract class CachedTag extends RevisionTag {
  private lastChecked: Revision = null;
  private lastValue: Revision = null;

  value(): Revision {
    let { lastChecked, lastValue } = this;

    if (lastChecked !== $REVISION) {
      this.lastChecked = $REVISION;
      this.lastValue = lastValue = this.compute();
    }

    return this.lastValue;
  }

  protected invalidate() {
    this.lastChecked = null;
  }

  protected abstract compute(): Revision;
}

class TagsPair extends CachedTag {
  private first: RevisionTag;
  private second: RevisionTag;

  constructor(first: RevisionTag, second: RevisionTag) {
    super();
    this.first = first;
    this.second = second;
  }

  protected compute(): Revision {
    return Math.max(this.first.value(), this.second.value());
  }
}

class TagsCombinator extends CachedTag {
  private tags: RevisionTag[];

  constructor(tags: RevisionTag[]) {
    super();
    this.tags = tags;
  }

  protected compute(): Revision {
    let { tags } = this;

    let max = -1;

    for (let i=0; i<tags.length; i++) {
      let value = tags[i].value();
      max = Math.max(value, max);
    }

    return max;
  }
}

export class UpdatableTag extends CachedTag {
  private tag: RevisionTag;
  private lastUpdated: Revision;

  constructor(tag: RevisionTag) {
    super();
    this.tag = tag;
    this.lastUpdated = INITIAL;
  }

  protected compute(): Revision {
    return Math.max(this.lastUpdated, this.tag.value());
  }

  update(tag: RevisionTag) {
    if (tag !== this.tag) {
      this.tag = tag;
      this.lastUpdated = $REVISION;
      this.invalidate();
    }
  }
}

//////////

export const CONSTANT_TAG: RevisionTag = new (
  class ConstantTag extends RevisionTag {
    value(): Revision {
      return CONSTANT;
    }
  }
);

export const VOLATILE_TAG: RevisionTag = new (
  class VolatileTag extends RevisionTag {
    value(): Revision {
      return VOLATILE;
    }
  }
);

export const CURRENT_TAG: DirtyableTag = new (
  class CurrentTag extends DirtyableTag {
    value(): Revision {
      return $REVISION;
    }
  }
);

//////////

export interface VersionedReference<T> extends Reference<T>, Tagged<Revision> {}

export interface VersionedPathReference<T> extends PathReference<T>, Tagged<Revision> {
  get(property: InternedString): VersionedPathReference<Opaque>;
}

export abstract class CachedReference<T> implements VersionedReference<T> {
  public tag: RevisionTag;

  private lastRevision: Revision = null;
  private lastValue: T = null;

  value(): T {
    let { tag, lastRevision, lastValue } = this;

    if (!lastRevision || !tag.validate(lastRevision)) {
      this.lastRevision = tag.value();
      lastValue = this.lastValue = this.compute();
    }

    return lastValue;
  }

  protected abstract compute(): T;

  protected invalidate() {
    this.lastRevision = null;
  }
}

//////////

type Mapper<T, U> = (value: T) => U;

class MapperReference<T, U> extends CachedReference<U> {
  public tag: RevisionTag;

  private reference: VersionedReference<T>;
  private mapper: Mapper<T, U>;

  constructor(reference: VersionedReference<T>, mapper: Mapper<T, U>) {
    super();
    this.tag = reference.tag;
    this.reference = reference;
    this.mapper = mapper;
  }

  protected compute(): U {
    let { reference, mapper } = this;
    return mapper(reference.value());
  }
}

export function map<T, U>(reference: VersionedReference<T>, mapper: Mapper<T, U>) {
  return new MapperReference(reference, mapper);
}

//////////

export class ReferenceCache<T> implements Tagged<Revision> {
  public tag: RevisionTag;

  private reference: VersionedReference<T>;
  private lastValue: T = null;
  private lastRevision: Revision = null;
  private initialized: boolean = false;

  constructor(reference: VersionedReference<T>) {
    this.tag = reference.tag;
    this.reference = reference;
  }

  peek(): T {
    if (!this.initialized) {
      return this.initialize();
    }

    return this.lastValue;
  }

  revalidate(): Validation<T> {
    if (!this.initialized) {
      return this.initialize();
    }

    let { reference, lastRevision } = this;
    let tag = reference.tag;

    if (tag.validate(lastRevision)) return NOT_MODIFIED;
    this.lastRevision = tag.value();

    let { lastValue } = this;
    let value = reference.value();
    if (value === lastValue) return NOT_MODIFIED;
    this.lastValue = value;

    return value;
  }

  private initialize(): T {
    let { reference } = this;

    let value = this.lastValue = reference.value();
    this.lastRevision = reference.tag.value();
    this.initialized = true;

    return value;
  }
}

export type Validation<T> = T | NotModified;

type NotModified = "adb3b78e-3d22-4e4b-877a-6317c2c5c145";

const NOT_MODIFIED: NotModified = "adb3b78e-3d22-4e4b-877a-6317c2c5c145";

export function isModified<T>(value: Validation<T>): value is T {
  return value !== NOT_MODIFIED;
}
