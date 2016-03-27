import { Opaque, Dict, Set, InternedString } from 'glimmer-util';
import { Reference, PathReference } from 'glimmer-reference';

export interface NotifiableReference<T> extends Reference<T> {
  // notify();
}

export interface ChainableReference<T> extends Reference<T> {
  // chain(child: Reference): Destroyable;
}

export interface PathReferenceFactory<T> {
  new (object: any, property: InternedString): PathReference<T>;
}

export interface RootReferenceFactory<T> {
  new (object: T): RootReference<T>;
}

export interface RootReference<T> extends PathReference<T> {
  update(value: T);
  referenceFromParts(parts: InternedString[]): PathReference<Opaque>;
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
