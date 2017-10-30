//mirroring some of the classes in https://github.com/glimmerjs/glimmer.js/blob/master/packages/@glimmer/component/src/references.ts
//these would be extracted into somewhere shared between ember and glimmer

import {
  PathReference,
  CONSTANT_TAG,
  // ConstReference,
  // DirtyableTag,
  UpdatableTag,
  combine,
  // isConst,
  Tag,
  TagWrapper
} from "@glimmer/reference";

/**
 * The base PathReference.
 */
export abstract class ComponentPathReference<T> implements PathReference<T> {
  abstract value(): T;
  abstract get tag(): Tag;
  abstract get(key: string): PathReference<any>;
}

export abstract class CachedReference<T> extends ComponentPathReference<T> {
  _lastRevision: number | null = null;
  _lastValue: any = null;

  abstract compute(): T;

  value() {
    let { tag, _lastRevision, _lastValue } = this;

    if (!_lastRevision || !tag.validate(_lastRevision)) {
      _lastValue = this._lastValue = this.compute();
      this._lastRevision = tag.value();
    }

    return _lastValue;
  }
}

export abstract class ConditionalHelperReference<T> extends CachedReference<T> {
  public branchTag: TagWrapper<UpdatableTag>;
  public tag: any;
  public cond: any;
  public truthy: any;
  public falsy: any;

  constructor(cond, truthy, falsy) {
    super();

    this.branchTag = UpdatableTag.create(CONSTANT_TAG);
    this.tag = combine([cond.tag, this.branchTag]);

    this.cond = cond;
    this.truthy = truthy;
    this.falsy = falsy;
  }

  compute() {
    let branch = this.cond.value() ? this.truthy : this.falsy;

    this.branchTag.inner.update(branch.tag);

    return branch.value();
  }
}
