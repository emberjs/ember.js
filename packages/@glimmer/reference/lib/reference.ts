import { Option, symbol } from '@glimmer/util';
import { Revision, Tag, Tagged, valueForTag, validateTag } from '@glimmer/validator';

export interface Reference<T> {
  value(): T;
}

export default Reference;

export interface PathReference<T> extends Reference<T> {
  get(key: string): PathReference<unknown>;
}

//////////

export interface VersionedReference<T = unknown> extends Reference<T>, Tagged {}

export interface VersionedPathReference<T = unknown> extends PathReference<T>, Tagged {
  get(property: string): VersionedPathReference<unknown>;
}

export abstract class CachedReference<T> implements VersionedReference<T> {
  public abstract tag: Tag;

  private lastRevision: Option<Revision> = null;
  private lastValue: Option<T> = null;

  value(): T {
    let { tag, lastRevision, lastValue } = this;

    if (lastRevision === null || !validateTag(tag, lastRevision)) {
      lastValue = this.lastValue = this.compute();
      this.lastRevision = valueForTag(tag);
    }

    return lastValue as T;
  }

  protected abstract compute(): T;

  protected invalidate() {
    this.lastRevision = null;
  }
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

    if (validateTag(tag, lastRevision as number)) return NOT_MODIFIED;

    let { lastValue } = this;
    let currentValue = reference.value();
    this.lastRevision = valueForTag(tag);

    if (currentValue === lastValue) return NOT_MODIFIED;
    this.lastValue = currentValue;

    return currentValue;
  }

  private initialize(): T {
    let { reference } = this;

    let currentValue = (this.lastValue = reference.value());
    this.lastRevision = valueForTag(reference.tag);
    this.initialized = true;

    return currentValue;
  }
}

export type Validation<T> = T | NotModified;

export type NotModified = typeof NOT_MODIFIED;

const NOT_MODIFIED: unique symbol = symbol('NOT_MODIFIED');

export function isModified<T>(value: Validation<T>): value is T {
  return value !== NOT_MODIFIED;
}
