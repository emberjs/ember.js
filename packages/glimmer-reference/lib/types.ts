import { Dict, Set, InternedString } from 'glimmer-util';

export interface Destroyable {
  destroy();
}

export interface Reference<T> extends Destroyable {
  value(): T;
  isDirty(): boolean;
}

export interface NotifiableReference<T> extends Reference<T> {
  // notify();
}

export interface ChainableReference<T> extends Reference<T> {
  // chain(child: Reference): Destroyable;
}

export interface PathReferenceFactory<T> {
  new (object: any, property: InternedString): PathReference<T>;
}

export interface PathReference<T> extends ChainableReference<T>, NotifiableReference<T> {
  get(key: InternedString): PathReference<any>;
}

export interface RootReferenceFactory<T> {
  new (object: T): RootReference<T>;
}

export const CONST_REFERENCE = "503c5a44-e4a9-4bb5-85bc-102d35af6985";

// this interface asserts that isDirty() will always be false and
// the value() will always be `===` to the previous value. It can
// be used to optimize code by replacing the reference with the
// literal value and avoiding updating-related bookkeeping.
export interface ConstReference<T> extends PathReference<T> {
  "503c5a44-e4a9-4bb5-85bc-102d35af6985": boolean;
}

export interface RootReference<T> extends PathReference<T> {
  update(value: T);
  referenceFromParts(parts: InternedString[]): PathReference<T>;
  chainFor(prop: InternedString): PathReference<T>;
}

import { InnerReferenceFactory } from './references/descriptors';

export interface MetaOptions {
  RootReferenceFactory?: RootReferenceFactory<any>;
  DefaultPathReferenceFactory?: InnerReferenceFactory<any>;
}

export interface Meta {
  root(): RootReference<any>;
  referencesFor(property: InternedString): Set<PathReference<any>>;
  referenceTypeFor(property: InternedString): InnerReferenceFactory<any>;
  getReferenceTypes(): Dict<InnerReferenceFactory<any>>;
  addReference(property: InternedString, reference: PathReference<any>);
  removeReference(property: InternedString, reference: PathReference<any>);
  getSlots(): Dict<any>;
}

export interface MetaLookup {
  for(obj: any): Meta;
}
