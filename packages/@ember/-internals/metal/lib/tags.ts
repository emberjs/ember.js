import { Meta, meta as metaFor } from '@ember/-internals/meta';
import { isProxy, setupMandatorySetter, symbol } from '@ember/-internals/utils';
import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { backburner } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import { CONSTANT_TAG, createTag, createUpdatableTag, dirty, Tag } from '@glimmer/reference';
import { AUTOTRACKING_TRANSACTION, getAutotrackingTransactionSourceForTag } from './tracked';
import { assert } from '@ember/debug';

export const UNKNOWN_PROPERTY_TAG = symbol('UNKNOWN_PROPERTY_TAG');

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
    let newTag = createUpdatableTag();

    if (DEBUG) {
      if (EMBER_METAL_TRACKED_PROPERTIES) {
        setupMandatorySetter!(object, propertyKey);
      }

      (newTag as any)._propertyKey = propertyKey;
    }

    return (tags[propertyKey] = newTag);
  } else {
    return (tags[propertyKey] = createTag());
  }
}

export function tagFor(object: any | null, _meta?: Meta): Tag {
  if (typeof object === 'object' && object !== null) {
    let meta = _meta === undefined ? metaFor(object) : _meta;

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
      let source = getAutotrackingTransactionSourceForTag(objectTag);

      assert(
        `You attempted to dirty \`${String(
          obj
        )}\`, but it had already been consumed previously in the same render. Attempting to dirty an a value after using it in the same render will cause infinite rerender bugs and performance issues, and is not supported. It was first used at: ${source &&
          source.stack}\n\nAnd was updated at:`,
        !source
      );
    }

    dirty(objectTag);
  }

  let tags = meta.readableTags();
  let propertyTag = tags !== undefined ? tags[propertyKey] : undefined;

  if (propertyTag !== undefined) {
    if (DEBUG) {
      let source = getAutotrackingTransactionSourceForTag(propertyTag);

      assert(
        `You attempted to dirty \`${propertyKey}\` on \`${String(
          obj
        )}\`, but it had already been consumed previously in the same render. Attempting to dirty an a value after using it in the same render will cause infinite rerender bugs and performance issues, and is not supported. It was first used at: ${source &&
          source.stack}\n\nAnd was updated at:`,
        !source
      );
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
