import { Set, InternedString } from 'htmlbars-util';

export interface Destroyable {
  destroy();
}

export interface Reference extends Destroyable {
  value(): any;
  isDirty(): boolean;
}

export interface NotifiableReference extends Reference {
  notify();
}

export interface ChainableReference extends Reference {
  chain(child: Reference): Destroyable;
}

export interface PathReferenceFactory {
  new (object: any, property: InternedString): PathReference;
}

export interface PathReference extends ChainableReference, NotifiableReference {
  get(key: InternedString): PathReference;
}

export interface RootReferenceFactory {
  new (parent: any): RootReference;
}

export interface RootReference extends PathReference {
  update(value: any);
  referenceFromParts(parts: InternedString[]): PathReference;
  chainFor(prop: InternedString): PathReference;
}

import { InnerReferenceFactory } from './references/descriptors';

export interface MetaOptions {
  RootReferenceFactory?: RootReferenceFactory,
  DefaultPathReferenceFactory?: InnerReferenceFactory
}

export interface MetaFactory {
  new (object: any, options: MetaOptions): Meta;
}

export interface Meta {
  root(): RootReference;
  referencesFor(property: InternedString): Set<PathReference>;
  referenceTypeFor(property: InternedString): InnerReferenceFactory;
  addReference(property: InternedString, reference: PathReference);
  removeReference(property: InternedString, reference: PathReference);
}

export interface MetaLookup {
  for(obj: any): Meta;
}