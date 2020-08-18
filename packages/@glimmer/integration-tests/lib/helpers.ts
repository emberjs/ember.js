import { Dict, CapturedArguments, VMArguments } from '@glimmer/interfaces';
import { PathReference, Reference } from '@glimmer/reference';

export type UserHelper = (args: ReadonlyArray<unknown>, named: Dict<unknown>) => unknown;

export class HelperReference implements PathReference {
  private helper: UserHelper;
  private args: CapturedArguments;

  constructor(helper: UserHelper, args: VMArguments) {
    this.helper = helper;
    this.args = args.capture();
  }

  isConst() {
    return false;
  }

  value() {
    let { helper, args } = this;

    return helper(args.positional.value(), args.named.value());
  }

  get(prop: string): SimplePathReference {
    return new SimplePathReference(this, prop);
  }
}

export class SimplePathReference implements PathReference {
  private parent: Reference<unknown>;
  private property: string;

  constructor(parent: Reference<unknown>, property: string) {
    this.parent = parent;
    this.property = property;
  }

  isConst() {
    return false;
  }

  value(): unknown {
    let value = this.parent.value();

    if (value === null || value === undefined) {
      return value;
    }

    return (value as any)[this.property];
  }

  get(prop: string): PathReference {
    return new SimplePathReference(this, prop);
  }
}
