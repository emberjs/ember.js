import { meta as metaFor } from '@ember/-internals/meta';
import { getDebugName, isObject, setupMandatorySetter, symbol, toString } from '@ember/-internals/utils';
import { assert, deprecate } from '@ember/debug';
import { backburner } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import {
  CONSTANT_TAG,
  dirtyTagFor,
  setAutotrackingTransactionEnv,
  setPropertyDidChange,
  Tag,
  tagFor,
} from '@glimmer/validator';

/////////

// Setup tracking environment

setPropertyDidChange(() => backburner.ensureInstance());

if (DEBUG) {
  setAutotrackingTransactionEnv!({
    assert(message) {
      assert(message, false);
    },

    deprecate(message) {
      deprecate(message, false, {
        id: 'autotracking.mutation-after-consumption',
        until: '4.0.0'
      });
    },

    debugMessage(obj, keyName) {
      let dirtyString = keyName
        ? `\`${keyName}\` on \`${getDebugName!(obj)}\``
        : `\`${getDebugName!(obj)}\``;

      return `You attempted to update ${dirtyString}, but it had already been used previously in the same computation.  Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.`;
    },
  });
}

/////////

export const UNKNOWN_PROPERTY_TAG = symbol('UNKNOWN_PROPERTY_TAG');

// This is exported for `@tracked`, but should otherwise be avoided. Use `tagForObject`.
export const SELF_TAG: string = symbol('SELF_TAG');

let SEEN_TAGS: WeakSet<Tag> | undefined;

if (DEBUG) {
  SEEN_TAGS = new WeakSet();
}

export function tagForProperty(obj: unknown, propertyKey: string | symbol): Tag {
  if (!isObject(obj)) {
    return CONSTANT_TAG;
  }

  if (!(propertyKey in obj) && typeof obj[UNKNOWN_PROPERTY_TAG] === 'function') {
    return obj[UNKNOWN_PROPERTY_TAG](propertyKey);
  }

  let tag = tagFor(obj, propertyKey);

  if (DEBUG && !SEEN_TAGS!.has(tag)) {
    SEEN_TAGS!.add(tag);

    setupMandatorySetter!(obj, propertyKey);

    (tag as any)._propertyKey = propertyKey;
  }

  return tag;
}

export function tagForObject(obj: unknown | null): Tag {
  if (isObject(obj)) {
    if (DEBUG) {
      let meta = metaFor(obj);

      assert(
        meta.isMetaDestroyed()
          ? `Cannot create a new tag for \`${toString(meta.source)}\` after it has been destroyed.`
          : '',
        !meta.isMetaDestroyed()
      );
    }

    return tagFor(obj, SELF_TAG);
  }

  return CONSTANT_TAG;
}

export function markObjectAsDirty(obj: object, propertyKey: string): void {
  // let meta = _meta === undefined ? metaFor(obj) : _meta;
  // let objectTag = meta.readableTag();

  // if (objectTag !== undefined) {
  //   if (DEBUG) {
  //     assertTagNotConsumed!(objectTag, obj);
  //   }

  //   dirty(objectTag);
  // }

  // let tags = meta.readableTags();
  // let propertyTag = tags !== undefined ? tags[propertyKey] : undefined;

  // if (propertyTag !== undefined) {
  //   if (DEBUG) {
  //     assertTagNotConsumed!(propertyTag, obj, propertyKey);
  //   }

  //   dirty(propertyTag);
  // }

  dirtyTagFor(obj, propertyKey);
  dirtyTagFor(obj, SELF_TAG);
}
