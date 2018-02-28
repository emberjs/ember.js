import { CONSTANT_TAG, DirtyableTag } from '@glimmer/reference';
import { meta as metaFor } from './meta';
import { isProxy } from './is_proxy';
import run from './run_loop';

let hasViews = () => false;

export function setHasViews(fn) {
  hasViews = fn;
}

function makeTag() {
  return DirtyableTag.create();
}

export function tagForProperty(object, propertyKey, _meta) {
  if (typeof object !== 'object' || object === null) { return CONSTANT_TAG; }

  if (isProxy(object)) {
    return tagFor(object, meta);
  }

  let meta = _meta === undefined ? metaFor(object) : _meta;
  let tags = meta.writableTags();
  let tag = tags[propertyKey];
  if (tag) { return tag; }

  return tags[propertyKey] = makeTag();
}

export function tagFor(object, _meta) {
  if (typeof object === 'object' && object !== null) {
    let meta = _meta === undefined ? metaFor(object) : _meta;
    return meta.writableTag(makeTag);
  } else {
    return CONSTANT_TAG;
  }
}

export function markObjectAsDirty(obj, propertyKey, meta) {
  let objectTag = meta.readableTag();

  if (objectTag !== undefined) {
    if (isProxy(obj)) {
      objectTag.inner.first.inner.dirty();
    } else {
      objectTag.inner.dirty();
    }
  }

  let tags = meta.readableTags();
  let propertyTag = tags !== undefined ? tags[propertyKey] : undefined;

  if (propertyTag !== undefined) {
    propertyTag.inner.dirty();
  }

  if (objectTag !== undefined || propertyTag !== undefined) {
    ensureRunloop();
  }
}

let backburner;
function ensureRunloop() {
  if (backburner === undefined) {
    backburner = run.backburner;
  }

  if (hasViews()) {
    backburner.ensureInstance();
  }
}
