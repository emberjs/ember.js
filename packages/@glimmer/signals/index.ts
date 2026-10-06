const GLIMMER_SIGNALS_REGISTRATION = Symbol('GLIMMER_SIGNALS_REGISTRATION');

if (Reflect.has(globalThis, GLIMMER_SIGNALS_REGISTRATION)) {
  throw new Error(
    'The `@glimmer/signals` library has been included twice in this application. It could be different versions of the package, or the same version included twice by mistake. `@glimmer/signals` depends on having a single copy of the package in use at any time in an application, even if they are the same version. You must dedupe your build to remove the duplicate packages in order to prevent this error.'
  );
}

Reflect.set(globalThis, GLIMMER_SIGNALS_REGISTRATION, true);

export { trackedArray } from './lib/collections/array';
export { trackedMap } from './lib/collections/map';
export { trackedObject } from './lib/collections/object';
export { trackedSet } from './lib/collections/set';
export { trackedWeakMap } from './lib/collections/weak-map';
export { trackedWeakSet } from './lib/collections/weak-set';
export { debug } from './lib/debug';
export { dirtyTagFor, releaseTagsFor, tagFor, type TagMeta, tagMetaFor } from './lib/meta';
export { trackedData } from './lib/tracked-data';
export {
  type Reactive,
  type ReadOnlyReactive,
  TrackedValue,
  trackedValue,
} from './lib/tracked-value';
export {
  abandonFrame,
  beginFrame,
  beginTrackFrame,
  beginUntrackFrame,
  type Cache,
  combine,
  CONSTANT_TAG,
  consumeFrame,
  consumeTag,
  createCache,
  createComputed,
  createFrame,
  createTag,
  dirtyTag,
  disposeFrame,
  endFrame,
  endTrackFrame,
  endUntrackFrame,
  getValue,
  isConst,
  isConstComputed,
  isConstTag,
  isFrameStale,
  isTracking,
  readComputed,
  releaseTag,
  resetTracking,
  TagNode,
  track,
  untrack,
  updateTag,
  watchTag,
  writeCount,
} from './lib/tags';
export type {
  CombinatorTag,
  ConstantTag,
  DirtyableTag,
  Tag,
  UpdatableTag,
} from '@glimmer/interfaces';
