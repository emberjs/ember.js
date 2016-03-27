import { Opaque, InternedString, intern, dict } from 'glimmer-util';
import { PathReference } from './path';
import { RootReference as IRootReference } from '../types';
import { VOLATILE_TAG, PathReference as IPathReference } from 'glimmer-reference';

export default class RootReference<T> implements IRootReference<T>, IPathReference<T> {
  private object: T;
  private chains = dict<PathReference<any>>();
  public tag = VOLATILE_TAG;

  constructor(object: T) {
    this.object = object;
  }

  value(): T { return this.object; }

  update(object: T) {
    this.object = object;
    // this.notify();
  }

  get<U>(prop: InternedString): IPathReference<U> {
    let chains = this.chains;
    if (<string>prop in chains) return chains[<string>prop];
    return (chains[<string>prop] = new PathReference(this, prop));
  }

  chainFor<U>(prop: InternedString): IPathReference<U> {
    let chains = this.chains;
    if (<string>prop in chains) return chains[<string>prop];
    return null;
  }

  path(string) {
    return string.split('.').reduce((ref, part) => ref.get(intern(part)), this);
  }

  referenceFromParts(parts: InternedString[]): IPathReference<Opaque> {
    return parts.reduce((ref, part) => ref.get(part) as IPathReference<Opaque>, this as IPathReference<Opaque>);
  }

  label() {
    return '[reference Root]';
  }
}
