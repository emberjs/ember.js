import { dict, isDict } from '@glimmer/util';
import {
  VersionedPathReference,
  CONSTANT_TAG,
  isConst,
  Tag,
  TagWrapper,
  combine,
  UpdatableDirtyableTag,
} from './validators';
import { pushTrackFrame, popTrackFrame } from './autotrack';
import { tagFor } from './tags';

export class RootReference<T> implements VersionedPathReference<T> {
  private children = dict<RootPropertyReference>();

  tag = CONSTANT_TAG;

  constructor(private inner: T) {}

  value(): T {
    return this.inner;
  }

  get(propertyKey: string): RootPropertyReference {
    let ref = this.children[propertyKey];

    if (!ref) {
      ref = this.children[propertyKey] = new RootPropertyReference(this.inner, propertyKey);
    }

    return ref;
  }
}

export class ImmutableRootReference<T> implements VersionedPathReference<T> {
  private children = dict<RootPropertyReference>();

  tag = CONSTANT_TAG;

  constructor(private inner: T) {}

  value(): T {
    return this.inner;
  }

  get(propertyKey: string): RootPropertyReference {
    let ref = this.children[propertyKey];

    if (!ref) {
      ref = this.children[propertyKey] = new RootPropertyReference(this.inner, propertyKey);
    }

    return ref;
  }
}

export type Primitive = undefined | null | boolean | number | string;

export class PrimitiveReference<T extends Primitive> implements VersionedPathReference<T> {
  readonly tag = CONSTANT_TAG;

  constructor(private inner: T) {}

  value(): T {
    return this.inner;
  }

  get(_key: string): PrimitiveReference<Primitive> {
    return UNDEFINED_REFERENCE;
  }
}

export const UNDEFINED_REFERENCE: PrimitiveReference<undefined> = new PrimitiveReference(undefined);

export function cached<T>(inner: VersionedPathReference<T>): VersionedPathReference<T> {
  return new Cached(inner);
}

export class Cached<T = unknown> implements VersionedPathReference<T> {
  private _lastRevision: number | null = null;
  private _lastValue: any = null;

  tag: Tag = CONSTANT_TAG;

  constructor(private inner: VersionedPathReference<T>) {}

  value() {
    let { tag, _lastRevision, _lastValue } = this;

    if (!_lastRevision || !tag.validate(_lastRevision)) {
      _lastValue = this._lastValue = this.inner.value();
      this._lastRevision = tag.value();
    }

    return _lastValue;
  }

  get(key: string): VersionedPathReference {
    return property(this, key);
  }
}

export function data(value: unknown): VersionedPathReference {
  if (isDict(value)) {
    return new RootReference(value);
  } else {
    return new PrimitiveReference(value as null | undefined);
  }
}

export function property(parentReference: VersionedPathReference, propertyKey: string) {
  if (isConst(parentReference)) {
    return new RootPropertyReference(parentReference.value(), propertyKey);
  } else {
    return new NestedPropertyReference(parentReference, propertyKey);
  }
}

// function isMutable(value: unknown): boolean {
//   return value !== null && typeof value === 'object' && !Object.isFrozen(value);
// }

// function child(value: unknown, key: string): VersionedPathReference {}

export class RootPropertyReference implements VersionedPathReference {
  tag: TagWrapper<UpdatableDirtyableTag>;
  private _parentValue: unknown;
  private _propertyKey: string;

  constructor(parentValue: unknown, propertyKey: string) {
    this._parentValue = parentValue;
    this._propertyKey = propertyKey;
    this.tag = UpdatableDirtyableTag.create(CONSTANT_TAG);
  }

  value(): unknown {
    let { _parentValue } = this;
    if (isDict(_parentValue)) {
      let old = pushTrackFrame();
      let ret = _parentValue[this._propertyKey];
      let tag = popTrackFrame(old);
      this.tag.inner.update(tag);
      return ret;
    } else {
      return undefined;
    }
  }

  get(key: string): VersionedPathReference {
    return new NestedPropertyReference(this, key);
  }
}

export class NestedPropertyReference implements VersionedPathReference {
  public tag: Tag;
  private _parentReference: VersionedPathReference;
  private _parentObjectTag: TagWrapper<UpdatableDirtyableTag>;
  private _propertyKey: string;

  constructor(parentReference: VersionedPathReference, propertyKey: string) {
    let parentReferenceTag = parentReference.tag;
    let parentObjectTag = UpdatableDirtyableTag.create(CONSTANT_TAG);

    this._parentReference = parentReference;
    this._parentObjectTag = parentObjectTag;
    this._propertyKey = propertyKey;

    this.tag = combine([parentReferenceTag, parentObjectTag]);
  }

  value() {
    let { _parentReference, _parentObjectTag, _propertyKey } = this;

    let parentValue = _parentReference.value();

    _parentObjectTag.inner.update(tagFor(parentValue, _propertyKey));

    if (isDict(parentValue)) {
      let old = pushTrackFrame();
      let ret = parentValue[_propertyKey];
      let tag = popTrackFrame(old);
      _parentObjectTag.inner.update(tag);
      return ret;
    } else {
      return undefined;
    }
  }

  get(key: string): VersionedPathReference {
    return new NestedPropertyReference(this, key);
  }
}
