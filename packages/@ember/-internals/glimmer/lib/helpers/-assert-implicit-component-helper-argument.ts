import { DEBUG } from '@glimmer/env';
import { Opaque } from '@glimmer/interfaces';
import { Tag, VersionedPathReference } from '@glimmer/reference';
import { Arguments, Helper, VM } from '@glimmer/runtime';
import { Maybe } from '@glimmer/util';

let helper: Maybe<Helper> = undefined;

if (DEBUG) {
  class ComponentAssertionReference implements VersionedPathReference<Opaque> {
    public tag: Tag;

    constructor(private component: VersionedPathReference<Opaque>, private message: string) {
      this.tag = component.tag;
    }

    value(): Opaque {
      let value = this.component.value();

      if (typeof value === 'string') {
        throw new TypeError(this.message);
      }

      return value;
    }

    get(property: string): VersionedPathReference<Opaque> {
      return this.component.get(property);
    }
  }

  helper = (_vm: VM, args: Arguments) =>
    new ComponentAssertionReference(args.positional.at(0), args.positional.at(1).value() as string);
}

export default helper;
