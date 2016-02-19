import { InternedString, intern, dict } from 'glimmer-util';
import { PathReference } from './path';
import { RootReference as IRootReference, PathReference as IPathReference } from 'glimmer-reference';
import PushPullReference from './push-pull';

export default class RootReference<T> extends PushPullReference<T> implements IRootReference<T>, IPathReference<T> {
  private object: T;
  private chains = dict<PathReference<any>>();

  constructor(object: T) {
    super();
    this.object = object;
  }

  isDirty() { return true; }

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

  referenceFromParts(parts: InternedString[]): IPathReference<any> {
    return parts.reduce((ref, part) => ref.get(part), <IPathReference<T>>this);
  }

  label() {
    return '[reference Root]';
  }
}

export function referenceFromParts<T>(path: IPathReference<T>, parts: InternedString[]): IPathReference<any> {
  return parts.reduce((ref, part) => ref.get(part), path);
}
