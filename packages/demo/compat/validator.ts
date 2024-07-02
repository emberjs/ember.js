import { formula } from '@lifeart/gxt';
import { validator, caching } from '@lifeart/gxt/glimmer-compatibility';

export const { dirtyTagFor, tagFor, isTracking, tagMetaFor, track, trackedData } = validator;
export const { getValue, createCache } = caching; // createCache,

export function consumeTag(tag) {
  if (!tag) {
    console.log('consumeEmptyTag');
    return;
  }
  return validator.consumeTag(tag);
}

export const CURRENT_TAG = formula(() => {
  return Date.now() + Math.random();
});
export const CONSTANT_TAG = 11;
export const ALLOW_CYCLES = true;
export function combine(tags) {
  if (tags.some((t => typeof t !== 'object'))) {
    debugger;
  }
  return formula(() => {
    return tags.map((t) => t.value);
  }, 'combine');
}
const validated = new WeakSet();
export function validateTag(tag) {
  if (!tag) {
    debugger;
  }
  if ('fn' in tag) {
    return true;
  }
  if (!validated.has(tag)) {
    validated.add(tag);
    return false;
  }
  return true;
}
export function resetTracking() {
  console.log('resetTracking', ...arguments);
}
export const COMPUTE = 13;
export const INITIAL = 31;
export function valueForTag(tag) {
  return Date.now() + Math.random();
}
export function createUpdatableTag() {
  console.log('createUpdatableTag');
}
export function updateTag() {
  console.log('updateTag');
}
// TODO: untrack is breaking reactivity here
export function untrack(cb) {
    // console.log('untrack', cb);
  return cb();
  // console.log('untrack', cb);
}
export function isConst() {
  console.log('isConst');
}
export function beginUntrackFrame() {
  console.log('beginUntrackFrame');
}
export function endUntrackFrame() {
  console.log('endUntrackFrame');
}

export function beginTrackFrame() {
  console.log('beginTrackFrame');
}
export function endTrackFrame() {
  console.log('endTrackFrame');
}
export function createTag() {
  console.log('createTag');
}
export function dirtyTag() {
  console.log('dirtyTag');
}
export function debug() {
  console.log('debug');
}
