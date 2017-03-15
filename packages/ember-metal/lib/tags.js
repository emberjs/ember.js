import { CONSTANT_TAG, DirtyableTag } from '@glimmer/reference';
import { meta as metaFor } from './meta';
import require from 'require';
import { isProxy } from './is_proxy';

let hasViews = () => false;

export function setHasViews(fn) {
  hasViews = fn;
}

function makeTag() {
  return new DirtyableTag();
}

export function tagForProperty(object, propertyKey, _meta) {
  if (isProxy(object)) {
    return tagFor(object, _meta);
  }

  if (typeof object === 'object' && object) {
    let meta = _meta || metaFor(object);
    let tags = meta.writableTags();
    let tag = tags[propertyKey];
    if (tag) { return tag; }

    return tags[propertyKey] = makeTag();
  } else {
    return CONSTANT_TAG;
  }
}

export function tagFor(object, _meta) {
  if (typeof object === 'object' && object) {
    let meta = _meta || metaFor(object);
    return meta.writableTag(makeTag);
  } else {
    return CONSTANT_TAG;
  }
}

export function markObjectAsDirty(meta, propertyKey) {
  let objectTag = meta && meta.readableTag();

  if (objectTag) {
    objectTag.dirty();
  }

  let tags = meta && meta.readableTags();
  let propertyTag = tags && tags[propertyKey];

  if (propertyTag) {
    propertyTag.dirty();
  }

  if (objectTag || propertyTag) {
    ensureRunloop();
  }
}

let run;

function K() {}

function ensureRunloop() {
  if (!run) {
    run = require('ember-metal').run;
  }

  if (hasViews() && !run.backburner.currentInstance) {
    run.schedule('actions', K);
  }
}
