import { Opaque, dict } from 'glimmer-util';
import { PathReference } from './path';
import { RootReference as IRootReference } from '../types';
import { VOLATILE_TAG, PathReference as IPathReference, RevisionTag } from 'glimmer-reference';

export default class RootReference<T> implements IRootReference<T>, IPathReference<T> {
  private object: T;
  private chains = dict<PathReference<any>>();
  public tag: RevisionTag = VOLATILE_TAG;

  constructor(object: T) {
    this.object = object;
  }

  value(): T { return this.object; }

  update(object: T) {
    this.object = object;
    // this.notify();
  }

  get<U>(prop: string): IPathReference<U> {
    let chains = this.chains;
    if (<string>prop in chains) return chains[prop];
    return (chains[prop] = new PathReference(this, prop));
  }

  chainFor<U>(prop: string): IPathReference<U> {
    let chains = this.chains;
    if (<string>prop in chains) return chains[prop];
    return null;
  }

  path(string) {
    return string.split('.').reduce((ref, part) => ref.get(part), this);
  }

  referenceFromParts(parts: string[]): IPathReference<Opaque> {
    return parts.reduce((ref, part) => ref.get(part) as IPathReference<Opaque>, this as IPathReference<Opaque>);
  }

  label() {
    return '[reference Root]';
  }
}
