import { meta as metaFor } from '@ember/-internals/meta';
import {
  getDebugName,
  isObject,
  setupMandatorySetter,
  symbol,
  toString,
} from '@ember/-internals/utils';
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
        until: '4.0.0',
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

export const CUSTOM_TAG_FOR = symbol('CUSTOM_TAG_FOR');

// This is exported for `@tracked`, but should otherwise be avoided. Use `tagForObject`.
export const SELF_TAG: string = symbol('SELF_TAG');

export function tagForProperty(
  obj: unknown,
  propertyKey: string | symbol,
  addMandatorySetter = false
): Tag {
  if (!isObject(obj)) {
    return CONSTANT_TAG;
  }

  if (typeof obj[CUSTOM_TAG_FOR] === 'function') {
    return obj[CUSTOM_TAG_FOR](propertyKey, addMandatorySetter);
  }

  let tag = tagFor(obj, propertyKey);

  if (DEBUG) {
    if (addMandatorySetter) {
      setupMandatorySetter!(tag, obj, propertyKey);
    }

    // TODO: Replace this with something more first class for tracking tags in DEBUG
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
  dirtyTagFor(obj, propertyKey);
  dirtyTagFor(obj, SELF_TAG);
}
