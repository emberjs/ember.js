import GlimmerInstance from './object';
import Meta, { ClassMeta } from './meta';
import { Computed } from './blueprint';

import {
  CURRENT_TAG,
  CONSTANT_TAG,
  VersionedPathReference,
  RevisionTag,
  combine
} from 'glimmer-reference';

import { Opaque, Option } from 'glimmer-util';

const META = new WeakMap();
const CLASS_META = new WeakMap();

export function classMeta(object: GlimmerInstance): ClassMeta {
  let m = CLASS_META.get(object);

  if (m === undefined) {
    m = new ClassMeta();
    CLASS_META.set(object, m);
  }

  return m;
}

export function meta(object: GlimmerInstance): Meta {
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

    let computed = classMeta(Object.getPrototypeOf(parentObject)).getComputed(key);
    let tags: RevisionTag[] = [meta(parentObject).tag(key)];

    if (computed) {
      tags.push(...computed.dependentKeys.map(key => path(this, key).tag));
    }

    this.tag = combine(tags);
    return parentObject[key];
  }

  get(key: PropertyKey): VersionedPathReference<Opaque> {
    return new VersionedObjectReference(this, key);
  }
}

function path(parent: VersionedPathReference<Opaque>, key: string): VersionedPathReference<Opaque> {
  return key.split('.').reduce((ref, part) => ref.get(part), parent);
}
