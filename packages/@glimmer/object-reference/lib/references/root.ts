import { Option, Opaque, dict } from '@glimmer/util';
import { PathReference } from './path';
import { RootReference as IRootReference } from '../types';
import { PathReference as IPathReference, Tag, CURRENT_TAG, bump } from '@glimmer/reference';

export default class RootReference<T> implements IRootReference<T>, IPathReference<T> {
  private object: T;
  private chains = dict<PathReference<any>>();
  public tag: Tag = CURRENT_TAG;

  constructor(object: T) {
    this.object = object;
  }

  value(): T { return this.object; }

  update(object: T) {
    this.object = object;
    bump();
  }

  get<U>(prop: string): IPathReference<U> {
    let chains = this.chains;
    if (prop as string in chains) return chains[prop];
    return (chains[prop] = new PathReference(this, prop));
  }

  chainFor<U>(prop: string): Option<IPathReference<U>> {
    let chains = this.chains;
    if (prop as string in chains) return chains[prop];
    return null;
  }

  path(string: string): IPathReference<Opaque> {
    return this.referenceFromParts(string.split('.'));
  }

  referenceFromParts(parts: string[]): IPathReference<Opaque> {
    return parts.reduce((ref, part) => ref.get(part) as IPathReference<Opaque>, this as IPathReference<Opaque>);
  }

  label() {
    return '[reference Root]';
  }
}
