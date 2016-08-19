import { meta as metaFor } from './meta';
import require, { has } from 'require';

const hasGlimmer = has('glimmer-reference');

let CONSTANT_TAG, CURRENT_TAG, DirtyableTag, makeTag, run;

let hasViews = () => false;
export function setHasViews(fn) {
  hasViews = fn;
}

export let markObjectAsDirty;

export function tagFor(object, _meta) {
  if (!hasGlimmer) {
    throw new Error('Cannot call tagFor without Glimmer');
  }

  if (typeof object === 'object' && object) {
    let meta = _meta || metaFor(object);
    return meta.writableTag(makeTag);
  } else {
    return CONSTANT_TAG;
  }
}

function K() {}
function ensureRunloop() {
  if (!run) {
    run = require('ember-metal/run_loop').default;
  }

  if (hasViews() && !run.backburner.currentInstance) {
    run.schedule('actions', K);
  }
}

if (hasGlimmer) {
  ({ DirtyableTag, CONSTANT_TAG, CURRENT_TAG } = require('glimmer-reference'));
  makeTag = () => new DirtyableTag();

  markObjectAsDirty = function(meta) {
    let tag = meta && meta.readableTag();

    if (tag) {
      ensureRunloop();
      tag.dirty();
    }
  };
} else {
  markObjectAsDirty = function() {};
}
