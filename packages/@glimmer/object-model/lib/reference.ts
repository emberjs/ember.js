import GlimmerInstance from './object';
import Meta, { ClassMeta } from './meta';

import {
  CURRENT_TAG,
  CONSTANT_TAG,
  VersionedPathReference,
  Tag,
  combine
} from '@glimmer/reference';

import { Opaque, HAS_NATIVE_WEAKMAP } from '@glimmer/util';

export let classMeta: (object: GlimmerInstance) => ClassMeta;
export let meta: (instance: GlimmerInstance) => Meta;

if (HAS_NATIVE_WEAKMAP) {
  const META = new WeakMap();
  const CLASS_META = new WeakMap();
  classMeta = function _classMetaNative(object: GlimmerInstance): ClassMeta {
    let m = CLASS_META.get(object);

    if (m === undefined) {
      m = new ClassMeta();
      CLASS_META.set(object, m);
    }

    return m;
  };

  meta = function _metaNative(object: GlimmerInstance): Meta {
    let m = META.get(object);

    if (m === undefined) {
      m = new Meta();
      META.set(object, m);
    }

    return m;
  };

} else {
  const GLIMMER_META = 'META__glimmer__1484170086860394543206811';
  const GLIMMER_CLASS_META = 'CLASS_META__glimmer__14841708559821468834708062';
  classMeta = function _classMetaFaux(object: GlimmerInstance): ClassMeta {
    let m = object[GLIMMER_CLASS_META];

    if (m === undefined) {
      m = new ClassMeta();
      object[GLIMMER_CLASS_META] = m;
    }

    return m;
  };

  meta = function _metaFaux(object: GlimmerInstance): Meta {
    let m = object[GLIMMER_META];

    if (m === undefined) {
      m = new Meta();
      object[GLIMMER_META] = m;
    }

    return m;
  };
}

export function set<T>(object: GlimmerInstance, key: PropertyKey, value: T) {
  object[key] = value;
  meta(object).dirty(key);
}

export function root<T extends GlimmerInstance>(object: T): VersionedRootReference<T> {
  return new VersionedRootReference(object);
}

export class VersionedRootReference<T> implements VersionedPathReference<Opaque> {
  public tag: Tag;

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
  public tag: Tag = CURRENT_TAG;

  constructor(private parent: VersionedPathReference<Opaque>, private key: PropertyKey) {}

  value() {
    let { parent, key } = this;
    let parentObject = parent.value() as GlimmerInstance;

    let computed = classMeta(Object.getPrototypeOf(parentObject)).getComputed(key);
    let tags: Tag[] = [meta(parentObject).tag(key)];

    if (computed) {
      for (let i = 0; i < computed.dependentKeys.length; i++) {
        let key = computed.dependentKeys[i];
        tags.push(path(this, key).tag);
      }
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
