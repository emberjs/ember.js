export { ComputedReferenceBlueprint, InnerReferenceFactory, PropertyReference } from "./lib/references/descriptors";
export { fork } from './lib/references/forked';
export { CLASS_META, default as Meta, metaFor } from "./lib/meta";
export { setProperty, notifyProperty } from './lib/object';
export { PushPullReference } from './lib/references/push-pull';
export * from './lib/types';
export { default as ObjectReference } from './lib/references/path';
export { default as UpdatableReference, referenceFromParts } from './lib/references/root';
export { ConstReference, isConst } from './lib/references/const';
export {
  IterationItem,
  Iterator,
  Iterable,
  OpaqueIterator,
  OpaqueIterable,
  AbstractIterator,
  AbstractIterable,
  IterationArtifacts,
  ReferenceIterator,
  IteratorSynchronizer,
  IteratorSynchronizerDelegate
} from './lib/references/iterable';
