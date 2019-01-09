import { Dict, CapturedArguments, VMArguments } from '@glimmer/interfaces';
import { PathReference, Tag, Reference, CURRENT_TAG } from '@glimmer/reference';

export type UserHelper = (args: ReadonlyArray<unknown>, named: Dict<unknown>) => unknown;

export class HelperReference implements PathReference<unknown> {
  private helper: UserHelper;
  private args: CapturedArguments;
  public tag: Tag = CURRENT_TAG;

  constructor(helper: UserHelper, args: VMArguments) {
    this.helper = helper;
    this.args = args.capture();
  }

  value() {
    let { helper, args } = this;

    return helper(args.positional.value(), args.named.value());
  }

  get(prop: string): SimplePathReference<unknown> {
    return new SimplePathReference(this, prop);
  }
}

export class SimplePathReference<T> implements PathReference<T> {
  private parent: Reference<Dict>;
  private property: string;
  public tag: Tag = CURRENT_TAG;

  constructor(parent: Reference<T>, property: string) {
    this.parent = parent;
    this.property = property;
  }

  value(): T {
    return this.parent.value()[this.property] as T;
  }

  get(prop: string): PathReference<unknown> {
    return new SimplePathReference(this, prop);
  }
}
