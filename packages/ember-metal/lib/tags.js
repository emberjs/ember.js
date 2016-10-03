import { CONSTANT_TAG, DirtyableTag } from 'glimmer-reference';
import { meta as metaFor } from './meta';
import require from 'require';

let hasViews = () => false;

export function setHasViews(fn) {
  hasViews = fn;
}

function makeTag() {
  return new DirtyableTag();
}

export function tagFor(object, _meta) {
  if (typeof object === 'object' && object) {
    let meta = _meta || metaFor(object);
    return meta.writableTag(makeTag);
  } else {
    return CONSTANT_TAG;
  }
}

export function markObjectAsDirty(meta) {
  let tag = meta && meta.readableTag();

  if (tag) {
    ensureRunloop();
    tag.dirty();
  }
}

let run;

function K() {}

function ensureRunloop() {
  if (!run) {
    run = require('ember-metal/run_loop').default;
  }

  if (hasViews() && !run.backburner.currentInstance) {
    run.schedule('actions', K);
  }
}
