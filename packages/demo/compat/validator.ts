import { formula } from '@lifeart/gxt';
import { validator } from '@lifeart/gxt/glimmer-compatibility';

export const { consumeTag, dirtyTagFor, tagFor, tagMetaFor, trackedData } = validator;

export const CURRENT_TAG = formula(() => {
  return Date.now() + Math.random();
});
export const CONSTANT_TAG = 11;
export const ALLOW_CYCLES = true;
export function combine() {
  // console.log('combine', ...arguments);
  return formula(() => void 0, 'combine');
}
export const validateTag = () => {
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
export function track() {
  console.log('track');
}
export function untrack(cb) {
  return cb();
  // console.log('untrack', cb);
}
export function isTracking() {
  // console.log('isTracking', ...arguments);
  return false;
}
export function createCache(fn) {
  return formula(fn);
}
export function getValue(tag) {
  // console.log('getValue', tag._debugName, tag.value);
  return tag.value;
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
