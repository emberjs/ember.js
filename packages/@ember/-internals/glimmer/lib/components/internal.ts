import { Owner, setOwner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { Reference, valueForRef } from '@glimmer/reference';

export default class InternalComponent {
  // Factory interface
  static create(): never {
    throw assert('Use constructor instead of create');
  }

  static get class(): typeof InternalComponent {
    return this;
  }

  static get fullName(): string {
    return this.name;
  }

  static get normalizedName(): string {
    return this.name;
  }

  constructor(
    protected owner: Owner,
    public args: Record<string, Reference | undefined>,
    public caller: unknown
  ) {
    setOwner(this, owner);
  }

  protected arg(key: string): unknown {
    let ref = this.args[key];
    return ref ? valueForRef(ref) : undefined;
  }

  toString(): string {
    return `<${this.constructor.toString()}:${guidFor(this)}>`;
  }
}
