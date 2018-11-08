import { Opaque } from './core';

export interface Reference<T> {
  value(): T;
}

export default Reference;

export interface PathReference<T> extends Reference<T> {
  get(key: string): PathReference<Opaque>;
}

export type Revision = number;

export interface RevisionTag {
  value(): Revision;
  validate(snapshot: Revision): boolean;
}
