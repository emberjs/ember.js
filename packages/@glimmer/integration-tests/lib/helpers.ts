import { Dict, CapturedArguments, VMArguments } from '@glimmer/interfaces';
import { CURRENT_TAG, Tag, VersionedPathReference, Reference } from '@glimmer/reference';

export type UserHelper = (args: ReadonlyArray<unknown>, named: Dict<unknown>) => unknown;

export class HelperReference implements VersionedPathReference<unknown> {
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

  get(prop: string): SimplePathReference {
    return new SimplePathReference(this, prop);
  }
}

export class SimplePathReference<T = unknown> implements VersionedPathReference<T> {
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

  get(prop: string): VersionedPathReference {
    return new SimplePathReference(this, prop);
  }
}
