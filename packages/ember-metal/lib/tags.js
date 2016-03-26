import { meta as metaFor } from './meta';
import require, { has } from 'require';

let hasGlimmer = has('glimmer-reference');
let CONSTANT_TAG, CURRENT_TAG, DirtyableTag, makeTag;

export let markObjectAsDirty;

export function tagFor(object, _meta) {
  if (!hasGlimmer) {
    throw new Error('Cannot call tagFor without Glimmer');
  }

  if (object && typeof object === 'object') {
    let meta = _meta || metaFor(object);
    return meta.writableTag(makeTag);
  } else {
    return CONSTANT_TAG;
  }
}

if (hasGlimmer) {
  ({ DirtyableTag, CONSTANT_TAG, CURRENT_TAG } = require('glimmer-reference'));
  makeTag = function() { return new DirtyableTag(); };

  markObjectAsDirty = function(meta) {
    let tag = (meta && meta.readableTag()) || CURRENT_TAG;
    tag.dirty();
  };
} else {
  markObjectAsDirty = function() {};
}
