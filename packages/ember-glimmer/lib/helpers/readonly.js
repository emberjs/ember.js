import { CachedReference, UnboundReference, UPDATE, READONLY } from '../utils/references';
import { CURRENT_TAG, DirtyableTag, combine, isConst } from 'glimmer-reference';

export default {
  isInternalHelper: true,
  toReference(args) {
    return ReadOnlyReference.create(args.positional.at(0));
  }
};

export class ReadOnlyReference extends CachedReference {
  static create(arg) {
    if (isConst(arg)) {
      return new UnboundReference(arg);
    }  else {
      return new ReadOnlyReference(arg);
    }
  }

  constructor(arg) {
    super();
    this.arg = arg;
    this.unboundTag = new DirtyableTag(CURRENT_TAG.value());
    this.tag = combine([arg.tag, this.unboundTag]);
    this.unboundValue = undefined;
    this[READONLY] = true;
  }

  [UPDATE](val) {
    this.unboundValue = val;
    this.unboundTag.dirty();
  }

  compute() {
    let { tag, unboundTag, unboundValue, arg } = this;
    let unboundTagValue = unboundTag.value();

    if (tag.validate(unboundTagValue) && !arg.tag.validate(unboundTagValue)) {
      return unboundValue;
    } else {
      return arg.value();
    }
  }
}
