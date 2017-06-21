import Reference, { PathReference } from './reference';
import { Opaque, Option, Slice, LinkedListNode } from '@glimmer/util';

//////////

export interface EntityTag<T> extends Reference<T> {
  value(): T;
  validate(snapshot: T): boolean;
}

export interface EntityTagged<T> {
  tag: EntityTag<T>;
}

export interface Tagged {
  tag: Tag;
}

//////////

export type Revision = number;

export const CONSTANT: Revision = 0;
export const INITIAL:  Revision = 1;
export const VOLATILE: Revision = NaN;

export abstract class RevisionTag implements EntityTag<Revision> {
  static id = 0;

  abstract value(): Revision;

  validate(snapshot: Revision): boolean {
    return this.value() === snapshot;
  }
}

const VALUE: ((tag: Option<RevisionTag>) => Revision)[] = [];
const VALIDATE: ((tag: Option<RevisionTag>, snapshot: Revision) => boolean)[] = [];

export class TagWrapper<T extends RevisionTag | null> {
  constructor(private type: number, public inner: T) {}

  value(): Revision {
    let func = VALUE[this.type];
    return func(this.inner);
  }

  validate(snapshot: Revision): boolean {
    let func = VALIDATE[this.type];
    return func(this.inner, snapshot);
  }
}

export type Tag = TagWrapper<RevisionTag | null>;

function register(Type: { create(...args: any[]): Tag, id: number }) {
  let type = VALUE.length;
  VALUE.push((tag: RevisionTag) => tag.value());
  VALIDATE.push((tag: RevisionTag, snapshot: Revision) => tag.validate(snapshot));
  Type.id = type;
}

///

// CONSTANT: 0
VALUE.push(() => CONSTANT);
VALIDATE.push((_tag, snapshot) => snapshot === CONSTANT);
export const CONSTANT_TAG = new TagWrapper(0, null);

// VOLATILE: 1
VALUE.push(() => VOLATILE);
VALIDATE.push((_tag, snapshot) => snapshot === VOLATILE);
export const VOLATILE_TAG = new TagWrapper(1, null);

// CURRENT: 2
VALUE.push(() => $REVISION);
VALIDATE.push((_tag, snapshot) => snapshot === $REVISION);
export const CURRENT_TAG = new TagWrapper(2, null);

export function isVolatile({ tag }: Tagged): boolean {
  return tag === VOLATILE_TAG;
}

export function isVolatileTag(tag: Tag): boolean {
  return tag === VOLATILE_TAG;
}

export function isConst({ tag }: Tagged): boolean {
  return tag === CONSTANT_TAG;
}

export function isConstTag(tag: Tag): boolean {
  return tag === CONSTANT_TAG;
}

///

let $REVISION = INITIAL;

export class DirtyableTag extends RevisionTag {
  static create(revision = $REVISION) {
    return new TagWrapper(this.id, new DirtyableTag(revision));
  }

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

register(DirtyableTag);

export function combineTagged(tagged: ReadonlyArray<Tagged>): Tag {
  let optimized: Tag[] = [];

  for (let i=0, l=tagged.length; i<l; i++) {
    let tag = tagged[i].tag;
    if (tag === VOLATILE_TAG) return VOLATILE_TAG;
    if (tag === CONSTANT_TAG) continue;
    optimized.push(tag);
  }

  return _combine(optimized);
}

export function combineSlice(slice: Slice<Tagged & LinkedListNode>): Tag {
  let optimized: Tag[] = [];

  let node = slice.head();

  while(node !== null) {
    let tag = node.tag;

    if (tag === VOLATILE_TAG) return VOLATILE_TAG;
    if (tag !== CONSTANT_TAG) optimized.push(tag);

    node = slice.nextNode(node);
  }

  return _combine(optimized);
}

export function combine(tags: Tag[]): Tag {
  let optimized: Tag[] = [];

  for (let i=0, l=tags.length; i<l; i++) {
    let tag = tags[i];
    if (tag === VOLATILE_TAG) return VOLATILE_TAG;
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
    case 2:
      return TagsPair.create(tags[0], tags[1]);
    default:
      return TagsCombinator.create(tags);
  };
}

export abstract class CachedTag extends RevisionTag {
  private lastChecked: Option<Revision> = null;
  private lastValue: Option<Revision> = null;

  value(): Revision {
    let { lastChecked, lastValue } = this;

    if (lastChecked !== $REVISION) {
      this.lastChecked = $REVISION;
      this.lastValue = lastValue = this.compute();
    }

    return this.lastValue as Revision;
  }

  protected invalidate() {
    this.lastChecked = null;
  }

  protected abstract compute(): Revision;
}

class TagsPair extends CachedTag {
  static create(first: Tag, second: Tag) {
    return new TagWrapper(this.id, new TagsPair(first, second));
  }

  private first: Tag;
  private second: Tag;

  private constructor(first: Tag, second: Tag) {
    super();
    this.first = first;
    this.second = second;
  }

  protected compute(): Revision {
    return Math.max(this.first.value(), this.second.value());
  }
}

register(TagsPair);

class TagsCombinator extends CachedTag {
  static create(tags: Tag[]) {
    return new TagWrapper(this.id, new TagsCombinator(tags));
  }

  private tags: Tag[];

  private constructor(tags: Tag[]) {
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

register(TagsCombinator);

export class UpdatableTag extends CachedTag {
  static create(tag: Tag): TagWrapper<UpdatableTag> {
    return new TagWrapper(this.id, new UpdatableTag(tag));
  }

  private tag: Tag;
  private lastUpdated: number;

  private constructor(tag: Tag) {
    super();
    this.tag = tag;
    this.lastUpdated = INITIAL;
  }

  protected compute(): Revision {
    return Math.max(this.lastUpdated, this.tag.value());
  }

  update(tag: Tag) {
    if (tag !== this.tag) {
      this.tag = tag;
      this.lastUpdated = $REVISION;
      this.invalidate();
    }
  }
}

register(UpdatableTag);

//////////

export interface VersionedReference<T = Opaque> extends Reference<T>, Tagged {}

export interface VersionedPathReference<T = Opaque> extends PathReference<T>, Tagged {
  get(property: string): VersionedPathReference<Opaque>;
}

export abstract class CachedReference<T> implements VersionedReference<T> {
  public abstract tag: Tag;

  private lastRevision: Option<Revision> = null;
  private lastValue: Option<T> = null;

  value(): T {
    let { tag, lastRevision, lastValue } = this;

    if (!lastRevision || !tag.validate(lastRevision)) {
      lastValue = this.lastValue = this.compute();
      this.lastRevision = tag.value();
    }

    return lastValue as T;
  }

  protected abstract compute(): T;

  protected invalidate() {
    this.lastRevision = null;
  }
}

//////////

export type Mapper<T, U> = (value: T) => U;

class MapperReference<T, U> extends CachedReference<U> {
  public tag: Tag;

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

export function map<T, U>(reference: VersionedReference<T>, mapper: Mapper<T, U>): VersionedReference<U> {
  return new MapperReference<T, U>(reference, mapper);
}

//////////

export class ReferenceCache<T> implements Tagged {
  public tag: Tag;

  private reference: VersionedReference<T>;
  private lastValue: Option<T> = null;
  private lastRevision: Option<Revision> = null;
  private initialized = false;

  constructor(reference: VersionedReference<T>) {
    this.tag = reference.tag;
    this.reference = reference;
  }

  peek(): T {
    if (!this.initialized) {
      return this.initialize();
    }

    return this.lastValue as T;
  }

  revalidate(): Validation<T> {
    if (!this.initialized) {
      return this.initialize();
    }

    let { reference, lastRevision } = this;
    let tag = reference.tag;

    if (tag.validate(lastRevision as number)) return NOT_MODIFIED;
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

export type NotModified = "adb3b78e-3d22-4e4b-877a-6317c2c5c145";

const NOT_MODIFIED: NotModified = "adb3b78e-3d22-4e4b-877a-6317c2c5c145";

export function isModified<T>(value: Validation<T>): value is T {
  return value !== NOT_MODIFIED;
}
