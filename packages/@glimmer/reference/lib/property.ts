import { dict, isDict } from '@glimmer/util';
import {
  CONSTANT_TAG,
  isConst,
  Tag,
  combine,
  createUpdatableTag,
  UpdatableTag,
  validate,
  value,
  dirty,
  update,
  track,
  tagFor,
} from '@glimmer/tag';
import { Dict } from '@glimmer/interfaces';
import { VersionedPathReference } from './reference';

export class RootReference<T> implements VersionedPathReference<T> {
  private children = dict<RootPropertyReference>();

  tag: Tag = CONSTANT_TAG;

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

  tag: Tag = CONSTANT_TAG;

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
  readonly tag: Tag = CONSTANT_TAG;

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

    if (!_lastRevision || !validate(tag, _lastRevision)) {
      _lastValue = this._lastValue = this.inner.value();
      this._lastRevision = value(tag);
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
  tag = createUpdatableTag();

  constructor(private _parentValue: unknown, private _propertyKey: string) {}

  value(): unknown {
    let { _parentValue } = this;
    if (isDict(_parentValue)) {
      let ret;
      let tag = track(() => {
        ret = (_parentValue as Dict)[this._propertyKey];
      });
      update(this.tag, tag);
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
  private _parentObjectTag: UpdatableTag;

  constructor(private _parentReference: VersionedPathReference, private _propertyKey: string) {
    let parentObjectTag = (this._parentObjectTag = createUpdatableTag());
    let parentReferenceTag = _parentReference.tag;

    this.tag = combine([parentReferenceTag, parentObjectTag]);
  }

  value() {
    let { _parentReference, _parentObjectTag, _propertyKey } = this;

    let parentValue = _parentReference.value();

    update(_parentObjectTag, tagFor(parentValue, _propertyKey));

    if (isDict(parentValue)) {
      let ret;
      let tag = track(() => {
        ret = (parentValue as Dict)[_propertyKey];
      });
      update(_parentObjectTag, tag);
      return ret;
    } else {
      return undefined;
    }
  }

  get(key: string): VersionedPathReference {
    return new NestedPropertyReference(this, key);
  }
}

export class UpdatableReference<T = unknown> implements VersionedPathReference<T> {
  public tag = createUpdatableTag();

  constructor(private _value: T) {}

  value() {
    return this._value;
  }

  update(value: T) {
    let { _value } = this;

    if (value !== _value) {
      dirty(this.tag);
      this._value = value;
    }
  }

  forceUpdate(value: T) {
    dirty(this.tag);
    this._value = value;
  }

  dirty() {
    dirty(this.tag);
  }

  get(key: string): VersionedPathReference {
    return new NestedPropertyReference(this, key);
  }
}

export function State<T>(data: T): UpdatableReference<T> {
  return new UpdatableReference(data);
}

const STABLE_STATE = new WeakMap();

export function StableState<T extends object>(data: T): UpdatableReference<T> {
  if (STABLE_STATE.has(data)) {
    return STABLE_STATE.get(data);
  } else {
    let ref = new UpdatableReference(data);
    STABLE_STATE.set(data, ref);
    return ref;
  }
}
