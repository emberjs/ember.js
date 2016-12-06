import GlimmerInstance from './object';
import Meta from './meta';

import {
  VersionedPathReference,
  RevisionTag,
  CURRENT_TAG,
  CONSTANT_TAG
} from 'glimmer-reference';

import { Opaque } from 'glimmer-util';

const META = new WeakMap();

export function meta(object: GlimmerInstance) {
  let m = META.get(object);

  if (m === undefined) {
    m = new Meta();
    META.set(object, m);
  }

  return m;
}

export function set<T>(object: GlimmerInstance, key: PropertyKey, value: T) {
  object[key] = value;
  meta(object).dirty(key);
}

export function root<T extends GlimmerInstance>(object: T): VersionedRootReference<T> {
  return new VersionedRootReference(object);
}

export class VersionedRootReference<T> implements VersionedPathReference<Opaque> {
  public tag: RevisionTag;

  constructor(private inner: T) {
    this.tag = CONSTANT_TAG;
  }

  value(): T {
    return this.inner;
  }

  get<T extends Opaque>(key: PropertyKey): VersionedPathReference<T> {
    return new VersionedObjectReference(this, key);
  }
}

export class VersionedObjectReference implements VersionedPathReference<Opaque> {
  public tag: RevisionTag = CURRENT_TAG;

  constructor(private parent: VersionedPathReference<Opaque>, private key: PropertyKey) {}

  value() {
    let { parent, key } = this;
    let parentObject = this.parent.value() as GlimmerInstance;
    this.tag = meta(parentObject).tag(key);
    return parentObject[key];
  }

  get(key: PropertyKey): VersionedPathReference<Opaque> {
    return new VersionedObjectReference(this, key);
  }
}
