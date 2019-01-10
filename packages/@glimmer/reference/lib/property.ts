import { dict, isDict } from '@glimmer/util';
import {
  VersionedPathReference,
  CONSTANT_TAG,
  isConst,
  Tag,
  TagWrapper,
  UpdatableTag,
  combine,
} from './validators';

export interface ObjectModel {
  tagForProperty(parent: unknown, key: string): Tag;
}

export interface ObjectModelReference<T = unknown> extends VersionedPathReference<T> {
  readonly objectModel: ObjectModel;
}

export class RootReference<T> implements VersionedPathReference<T> {
  private children = dict<RootPropertyReference>();

  tag = CONSTANT_TAG;

  constructor(private inner: T, private objectModel: ObjectModel) {}

  value(): T {
    return this.inner;
  }

  get(propertyKey: string): RootPropertyReference {
    let ref = this.children[propertyKey];

    if (!ref) {
      ref = this.children[propertyKey] = new RootPropertyReference(
        this.inner,
        propertyKey,
        this.objectModel
      );
    }

    return ref;
  }
}

export function cached<T>(inner: ObjectModelReference<T>): VersionedPathReference<T> {
  return new CachedReference(inner, inner.objectModel);
}

export class CachedReference<T = unknown> implements VersionedPathReference<T> {
  private _lastRevision: number | null = null;
  private _lastValue: any = null;

  tag: Tag = CONSTANT_TAG;

  constructor(private inner: VersionedPathReference<T>, protected objectModel: ObjectModel) {}

  value() {
    let { tag, _lastRevision, _lastValue } = this;

    if (!_lastRevision || !tag.validate(_lastRevision)) {
      _lastValue = this._lastValue = this.inner.value();
      this._lastRevision = tag.value();
    }

    return _lastValue;
  }

  get(key: string): VersionedPathReference {
    return property(this, key, this.objectModel);
  }
}

export function data(
  ref: VersionedPathReference,
  objectModel: ObjectModel
): VersionedPathReference {
  return new RootReference(ref, objectModel);
}

export function property(
  parentReference: VersionedPathReference,
  propertyKey: string,
  objectModel: ObjectModel
) {
  if (isConst(parentReference)) {
    return new RootPropertyReference(parentReference.value(), propertyKey, objectModel);
  } else {
    return new NestedPropertyReference(parentReference, propertyKey, objectModel);
  }
}

export class RootPropertyReference implements ObjectModelReference {
  tag: Tag;
  private _parentValue: unknown;
  private _propertyKey: string;

  constructor(parentValue: unknown, propertyKey: string, readonly objectModel: ObjectModel) {
    this._parentValue = parentValue;
    this._propertyKey = propertyKey;
    this.tag = objectModel.tagForProperty(parentValue, propertyKey);
  }

  value(): unknown {
    return (this._parentValue as any)[this._propertyKey];
  }

  get(key: string): VersionedPathReference {
    return new NestedPropertyReference(this, key, this.objectModel);
  }
}

export class NestedPropertyReference implements VersionedPathReference, ObjectModelReference {
  public tag: Tag;
  private _parentReference: VersionedPathReference;
  private _parentObjectTag: TagWrapper<UpdatableTag>;
  private _propertyKey: string;

  constructor(
    parentReference: VersionedPathReference,
    propertyKey: string,
    readonly objectModel: ObjectModel
  ) {
    let parentReferenceTag = parentReference.tag;
    let parentObjectTag = UpdatableTag.create(CONSTANT_TAG);

    this._parentReference = parentReference;
    this._parentObjectTag = parentObjectTag;
    this._propertyKey = propertyKey;

    this.tag = combine([parentReferenceTag, parentObjectTag]);
  }

  value() {
    let { _parentReference, _parentObjectTag, _propertyKey } = this;

    let parentValue = _parentReference.value();

    _parentObjectTag.inner.update(this.objectModel.tagForProperty(parentValue, _propertyKey));

    if (typeof parentValue === 'string' && _propertyKey === 'length') {
      return parentValue.length;
    }

    if (isDict(parentValue)) {
      return parentValue[_propertyKey];
    } else {
      return undefined;
    }
  }

  get(key: string): VersionedPathReference {
    return new NestedPropertyReference(this, key, this.objectModel);
  }
}
