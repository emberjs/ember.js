import { isObject, setupMandatorySetter, toString } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { isDestroyed } from '@glimmer/destroyable';
import { DEBUG } from '@glimmer/env';
import { getCustomTagFor } from '@glimmer/manager';
import type { Tag, TagMeta } from '@glimmer/validator';
import { CONSTANT_TAG, dirtyTagFor, tagFor } from '@glimmer/validator';

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
    if ((globalThis as any).__GXT_MODE__) {
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

// Expose markObjectAsDirty on globalThis for GXT integration.
// This allows compile.ts to dirty a component's Ember SELF_TAG when
// a property changes on an object that is a VALUE of a component property.
(globalThis as any).__gxtMarkObjectAsDirty = markObjectAsDirty;
