export { ComputedReferenceBlueprint, InnerReferenceFactory, PropertyReference } from "./lib/references/descriptors";
export { fork } from './lib/references/forked';
export { CLASS_META, default as Meta, metaFor } from "./lib/meta";
export { setProperty, notifyProperty } from './lib/object';
export { PushPullReference } from './lib/references/push-pull';
export * from './lib/types';
export { default as UpdatableReference, referenceFromParts } from './lib/references/root';
export { ConstReference } from './lib/references/const';
export { ListManager, ListIterator, ListDelegate } from './lib/references/iterable';