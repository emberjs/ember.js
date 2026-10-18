import { isObject } from '@ember/-internals/utils/lib/spec';
import { setupMandatorySetter } from '@ember/-internals/utils/lib/mandatory-setter';
import toString from '@ember/-internals/utils/lib/to-string';
import { assert } from '@ember/debug';
import { isDestroyed } from '@glimmer/destroyable';
import { DEBUG } from '@glimmer/env';
import { getCustomTagFor } from '@glimmer/manager/lib/util/args-proxy';
import type { Tag } from '@glimmer/interfaces';
import type { TagMeta } from '@glimmer/validator/lib/meta';
import { CONSTANT_TAG } from '@glimmer/validator/lib/validators';
import { dirtyTagFor, tagFor } from '@glimmer/validator/lib/meta';

/////////

type CustomTagFnWithMandatorySetter = (
  obj: object,
  key: string | symbol,
  addMandatorySetter: boolean
) => Tag;

// This is exported for `@tracked`, but should otherwise be avoided. Use `tagForObject`.
export const SELF_TAG: string | symbol = Symbol('SELF_TAG');

export function tagForProperty(
  obj: object,
  propertyKey: string | symbol,
  addMandatorySetter = false,
  meta?: TagMeta
): Tag {
  let customTagFor = getCustomTagFor(obj);

  if (customTagFor !== undefined) {
    return (customTagFor as CustomTagFnWithMandatorySetter)(obj, propertyKey, addMandatorySetter);
  }

  let tag = tagFor(obj, propertyKey, meta);

  if (DEBUG && addMandatorySetter) {
    // In GXT mode, mandatory setter interacts poorly with the backend's
    // component rendering pipeline: the backend re-assigns reserved props
    // (args, attrs, element) during render, and direct property writes from
    // classic component instances (isComponent=true) flow through paths that
    // bypass setWithMandatorySetter. Skip for those cases to avoid false
    // positives while preserving the DEBUG checks for plain objects/observers
    // on non-component EmberObjects (e.g. EmberObject.create, controllers).
    if (__GXT_MODE__) {
      if (
        propertyKey === 'args' ||
        propertyKey === 'attrs' ||
        propertyKey === 'element' ||
        propertyKey === 'elementId' ||
        propertyKey === 'parentView' ||
        propertyKey === 'childViews' ||
        propertyKey === '_view'
      ) {
        return tag;
      }
      if ((obj as any).isComponent) {
        return tag;
      }
    }
    setupMandatorySetter!(tag, obj, propertyKey);
  }

  return tag;
}

export function tagForObject(obj: unknown | null): Tag {
  if (isObject(obj)) {
    if (DEBUG) {
      assert(
        isDestroyed(obj)
          ? `Cannot create a new tag for \`${toString(obj)}\` after it has been destroyed.`
          : '',
        !isDestroyed(obj)
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
