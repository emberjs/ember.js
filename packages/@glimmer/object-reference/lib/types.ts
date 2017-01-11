import { Opaque, Dict, Set } from '@glimmer/util';
import { Reference, PathReference } from '@glimmer/reference';

export interface NotifiableReference<T> extends Reference<T> {
  // notify();
}

export interface ChainableReference<T> extends Reference<T> {
  // chain(child: Reference): Destroyable;
}

export interface PathReferenceFactory<T> {
  new (object: any, property: string): PathReference<T>;
}

export interface RootReferenceFactory<T> {
  new (object: T): RootReference<T>;
}

export interface RootReference<T> extends PathReference<T> {
  update(value: T);
  referenceFromParts(parts: string[]): PathReference<Opaque>;
  chainFor(prop: string): PathReference<T>;
}

import { InnerReferenceFactory } from './references/descriptors';

export interface MetaOptions {
  RootReferenceFactory?: RootReferenceFactory<any>;
  DefaultPathReferenceFactory?: InnerReferenceFactory<any>;
}

export interface Meta {
  root(): RootReference<any>;
  referencesFor(property: string): Set<PathReference<any>>;
  referenceTypeFor(property: string): InnerReferenceFactory<any>;
  getReferenceTypes(): Dict<InnerReferenceFactory<any>>;
  addReference(property: string, reference: PathReference<any>);
  removeReference(property: string, reference: PathReference<any>);
  getSlots(): Dict<any>;
}

export interface MetaLookup {
  for(obj: any): Meta;
}
