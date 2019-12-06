import { Meta, meta as metaFor } from '@ember/-internals/meta';
import { setupMandatorySetter, symbol } from '@ember/-internals/utils';
import { backburner } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import { CONSTANT_TAG, createUpdatableTag, dirty, Tag } from '@glimmer/reference';
import { assertTagNotConsumed } from './tracked';

export const UNKNOWN_PROPERTY_TAG = symbol('UNKNOWN_PROPERTY_TAG');

export function tagForProperty(object: any, propertyKey: string | symbol): Tag {
  let objectType = typeof object;
  if (objectType !== 'function' && (objectType !== 'object' || object === null)) {
    return CONSTANT_TAG;
  }

  if (!(propertyKey in object) && typeof object[UNKNOWN_PROPERTY_TAG] === 'function') {
    return object[UNKNOWN_PROPERTY_TAG](propertyKey);
  }

  let tags = metaFor(object).writableTags();
  let tag = tags[propertyKey];
  if (tag !== undefined) {
    return tag;
  }

  let newTag = createUpdatableTag();

  if (DEBUG) {
    setupMandatorySetter!(object, propertyKey);
    (newTag as any)._propertyKey = propertyKey;
  }

  return (tags[propertyKey] = newTag);
}

export function tagFor(object: any | null): Tag {
  if (typeof object === 'object' && object !== null) {
    let meta = metaFor(object);

    if (!meta.isMetaDestroyed()) {
      return meta.writableTag();
    }
  }

  return CONSTANT_TAG;
}

export function markObjectAsDirty(obj: object, propertyKey: string, _meta?: Meta): void {
  let meta = _meta === undefined ? metaFor(obj) : _meta;
  let objectTag = meta.readableTag();

  if (objectTag !== undefined) {
    if (DEBUG) {
      assertTagNotConsumed!(objectTag, obj);
    }

    dirty(objectTag);
  }

  let tags = meta.readableTags();
  let propertyTag = tags !== undefined ? tags[propertyKey] : undefined;

  if (propertyTag !== undefined) {
    if (DEBUG) {
      assertTagNotConsumed!(propertyTag, obj, propertyKey);
    }

    dirty(propertyTag);
  }

  if (objectTag !== undefined || propertyTag !== undefined) {
    ensureRunloop();
  }
}

export function ensureRunloop(): void {
  backburner.ensureInstance();
}
