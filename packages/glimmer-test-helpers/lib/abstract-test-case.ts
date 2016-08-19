import { PathReference, Tagged, Revision, RevisionTag, DirtyableTag } from 'glimmer-reference';
import { Opaque } from 'glimmer-util';
import { assign } from './helpers';

export function skip(target: Object, name: string, descriptor: PropertyDescriptor) {
  descriptor.value['skip'] = true;
}

export class VersionedObject implements Tagged<Revision> {
  public tag: DirtyableTag;
  public value: Object;

  constructor(value: Object) {
    this.tag = new DirtyableTag();
    assign(this, value);
  }

  update(value: Object) {
    assign(this, value);
    this.dirty();
  }

  set(key: string, value: Opaque) {
    this[key] = value;
    this.dirty();
  }

  dirty() {
    this.tag.dirty();
  }
}

export class SimpleRootReference implements PathReference<Opaque> {
  public tag: RevisionTag;

  constructor(private object: VersionedObject) {
    this.tag = object.tag;
  }

  get(key: string): SimplePathReference {
    return new SimplePathReference(this, key);
  }

  value(): Object {
    return this.object;
  }
}

class SimplePathReference implements PathReference<Opaque> {
  public tag: RevisionTag;

  constructor(private parent: PathReference<Opaque>, private key: string) {
    this.tag = parent.tag;
  }

  get(key: string): SimplePathReference {
    return new SimplePathReference(this, key);
  }

  value() {
    return this.parent.value()[this.key];
  }
}
