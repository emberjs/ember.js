import { DEBUG } from '@glimmer/env';
import { Opaque } from '@glimmer/interfaces';
import { Tag, VersionedPathReference } from '@glimmer/reference';
import { Arguments, VM } from '@glimmer/runtime';

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

export default (_vm: VM, args: Arguments) => {
  if (DEBUG) {
    return new ComponentAssertionReference(args.positional.at(0), args.positional
      .at(1)
      .value() as string);
  } else {
    return args.positional.at(0);
  }
};
