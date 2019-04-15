import { Meta, meta as metaFor } from '@ember/-internals/meta';
import { isProxy, setupMandatorySetter, symbol } from '@ember/-internals/utils';
import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { backburner } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import {
  combine,
  CONSTANT_TAG,
  DirtyableTag,
  Tag,
  TagWrapper,
  UpdatableTag,
} from '@glimmer/reference';

export const UNKNOWN_PROPERTY_TAG = symbol('UNKNOWN_PROPERTY_TAG');

function makeTag(): TagWrapper<DirtyableTag> {
  return DirtyableTag.create();
}

export function tagForProperty(object: any, propertyKey: string | symbol, _meta?: Meta): Tag {
  let objectType = typeof object;
  if (objectType !== 'function' && (objectType !== 'object' || object === null)) {
    return CONSTANT_TAG;
  }
  let meta = _meta === undefined ? metaFor(object) : _meta;

  if (EMBER_METAL_TRACKED_PROPERTIES) {
    if (!(propertyKey in object) && typeof object[UNKNOWN_PROPERTY_TAG] === 'function') {
      return object[UNKNOWN_PROPERTY_TAG](propertyKey);
    }
  } else if (isProxy(object)) {
    return tagFor(object, meta);
  }

  let tags = meta.writableTags();
  let tag = tags[propertyKey];
  if (tag) {
    return tag;
  }

  if (EMBER_METAL_TRACKED_PROPERTIES) {
    let pair = combine([makeTag(), UpdatableTag.create(CONSTANT_TAG)]);

    if (DEBUG) {
      if (EMBER_METAL_TRACKED_PROPERTIES) {
        setupMandatorySetter!(object, propertyKey);
      }

      (pair as any)._propertyKey = propertyKey;
    }

    return (tags[propertyKey] = pair);
  } else {
    return (tags[propertyKey] = makeTag());
  }
}

export function tagFor(object: any | null, _meta?: Meta): Tag {
  if (typeof object === 'object' && object !== null) {
    let meta = _meta === undefined ? metaFor(object) : _meta;

    if (!meta.isMetaDestroyed()) {
      return meta.writableTag(makeTag);
    }
  }

  return CONSTANT_TAG;
}

export let dirty: (tag: Tag) => void;
export let update: (outer: Tag, inner: Tag) => void;

if (EMBER_METAL_TRACKED_PROPERTIES) {
  dirty = tag => {
    (tag.inner! as any).first.inner.dirty();
  };

  update = (outer, inner) => {
    (outer.inner! as any).lastChecked = 0;
    (outer.inner! as any).second.inner.update(inner);
  };
} else {
  dirty = tag => {
    (tag.inner! as any).dirty();
  };
}

export function markObjectAsDirty(obj: object, propertyKey: string, _meta?: Meta): void {
  let meta = _meta === undefined ? metaFor(obj) : _meta;
  let objectTag = meta.readableTag();

  if (objectTag !== undefined) {
    if (isProxy(obj)) {
      (objectTag.inner! as any).first.inner.dirty();
    } else {
      (objectTag.inner! as any).dirty();
    }
  }

  let tags = meta.readableTags();
  let propertyTag = tags !== undefined ? tags[propertyKey] : undefined;

  if (propertyTag !== undefined) {
    dirty(propertyTag);
  }

  if (objectTag !== undefined || propertyTag !== undefined) {
    ensureRunloop();
  }
}

export function ensureRunloop(): void {
  backburner.ensureInstance();
}
