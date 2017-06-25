import { CONSTANT_TAG, DirtyableTag } from '@glimmer/reference';
import { meta as metaFor } from './meta';
import require from 'require';

let hasViews = () => false;

export function setHasViews(fn) {
  hasViews = fn;
}

function makeTag() {
  return new DirtyableTag();
}

export function tagForProperty(object, propertyKey, _meta) {
  if (typeof object !== 'object' || object === null) { return CONSTANT_TAG; }

  let meta = _meta || metaFor(object);
  if (meta.isProxy()) {
    return tagFor(object, meta);
  }

  let tags = meta.writableTags();
  let tag = tags[propertyKey];
  if (tag) { return tag; }

  return tags[propertyKey] = makeTag();
}

export function tagFor(object, _meta) {
  if (typeof object === 'object' && object !== null) {
    let meta = _meta || metaFor(object);
    return meta.writableTag(makeTag);
  } else {
    return CONSTANT_TAG;
  }
}

export function markObjectAsDirty(meta, propertyKey) {
  let objectTag = meta.readableTag();

  if (objectTag !== undefined) {
    objectTag.dirty();
  }

  let tags = meta.readableTags();
  let propertyTag = tags !== undefined ? tags[propertyKey] : undefined;

  if (propertyTag !== undefined) {
    propertyTag.dirty();
  }

  if (propertyKey === 'content' && meta.isProxy()) {
    meta.getTag().contentDidChange();
  }

  if (objectTag !== undefined || propertyTag !== undefined) {
    ensureRunloop();
  }
}

let run;
function ensureRunloop() {
  if (run === undefined) {
    run = require('ember-metal').run;
  }

  if (hasViews()) {
    run.backburner.ensureInstance();
  }
}
