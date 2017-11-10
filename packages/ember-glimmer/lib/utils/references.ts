import {
  combine,
  CONSTANT_TAG,
  ConstReference,
  DirtyableTag,
  isConst,
  TagWrapper,
  UpdatableTag,
} from '@glimmer/reference';
import {
  CapturedArguments,
  ConditionalReference as GlimmerConditionalReference,
  PrimitiveReference,
  VM,
} from '@glimmer/runtime';
import { DEBUG } from 'ember-env-flags';
import {
  didRender,
  get,
  isProxy,
  set,
  tagFor,
  tagForProperty,
  watchKey,
} from 'ember-metal';
import {
  HAS_NATIVE_WEAKMAP,
  symbol,
} from 'ember-utils';
import {
  EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER,
  EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER,
  MANDATORY_SETTER,
} from 'ember/features';
import {
  RECOMPUTE_TAG,
  SimpleHelperFactory,
} from '../helper';
import emberToBool from './to-bool';

export const UPDATE = symbol('UPDATE');

let maybeFreeze: (obj: any) => void;
if (DEBUG) {
  // gaurding this in a DEBUG gaurd (as well as all invocations)
  // so that it is properly stripped during the minification's
  // dead code elimination
  maybeFreeze = (obj: any) => {
    // re-freezing an already frozen object introduces a significant
    // performance penalty on Chrome (tested through 59).
    //
    // See: https://bugs.chromium.org/p/v8/issues/detail?id=6450
    if (!Object.isFrozen(obj) && HAS_NATIVE_WEAKMAP) {
      Object.freeze(obj);
    }
  };
}

// @abstract
// @implements PathReference
class EmberPathReference {
  // @abstract get tag()
  // @abstract value()

  get(key: string): any {
    return PropertyReference.create(this, key);
  }
}

// @abstract
export class CachedReference extends EmberPathReference {
  private _lastRevision: any;
  private _lastValue: any;
  public tag: any;

  constructor() {
    super();
    this._lastRevision = null;
    this._lastValue = null;
  }

  compute() { /* NOOP */ }

  value() {
    let { tag, _lastRevision, _lastValue } = this;

    if (!_lastRevision || !tag.validate(_lastRevision)) {
      _lastValue = this._lastValue = this.compute();
      this._lastRevision = tag.value();
    }

    return _lastValue;
  }

  // @abstract compute()
}

// @implements PathReference
export class RootReference<T> extends ConstReference<T> {
  public children: any;

  constructor(value: T) {
    super(value);
    this.children = Object.create(null);
  }

  get(propertyKey: string) {
    let ref = this.children[propertyKey];

    if (ref === undefined) {
      ref = this.children[propertyKey] = new RootPropertyReference(this.inner, propertyKey);
    }

    return ref;
  }
}

let TwoWayFlushDetectionTag: any;

if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER ||
    EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER) {
  TwoWayFlushDetectionTag = class {
    public tag: any;
    public parent: any;
    public key: string;
    public ref: any;

    constructor(tag: TagWrapper<UpdatableTag>, key: string, ref: any) {
      this.tag = tag;
      this.parent = null;
      this.key = key;
      this.ref = ref;
    }

    value() {
      return this.tag.value();
    }

    validate(ticket: any) {
      let { parent, key } = this;

      let isValid = this.tag.validate(ticket);

      if (isValid && parent) {
        didRender(parent, key, this.ref);
      }

      return isValid;
    }

    didCompute(parent: any) {
      this.parent = parent;
      didRender(parent, this.key, this.ref);
    }
  };
}

export class PropertyReference extends CachedReference {
  static create(parentReference: any, propertyKey: string) {
    if (isConst(parentReference)) {
      return new RootPropertyReference(parentReference.value(), propertyKey);
    } else {
      return new NestedPropertyReference(parentReference, propertyKey);
    }
  }

  get(key: string) {
    return new NestedPropertyReference(this, key);
  }
}

export class RootPropertyReference extends PropertyReference {
  private _parentValue: any;
  private _propertyKey: string;

  constructor(parentValue: any, propertyKey: string) {
    super();

    this._parentValue = parentValue;
    this._propertyKey = propertyKey;

    if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER ||
        EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER) {
      this.tag = new TwoWayFlushDetectionTag(tagForProperty(parentValue, propertyKey), propertyKey, this);
    } else {
      this.tag = tagForProperty(parentValue, propertyKey);
    }

    if (MANDATORY_SETTER) {
      watchKey(parentValue, propertyKey);
    }
  }

  compute() {
    let { _parentValue, _propertyKey } = this;

    if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER ||
        EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER) {
      this.tag.didCompute(_parentValue);
    }

    return get(_parentValue, _propertyKey);
  }

  [UPDATE](value: any) {
    set(this._parentValue, this._propertyKey, value);
  }
}

export class NestedPropertyReference extends PropertyReference {
  private _parentReference: any;
  private _parentObjectTag: TagWrapper<UpdatableTag>;
  private _propertyKey: string;

  constructor(parentReference: any, propertyKey: string) {
    super();

    let parentReferenceTag = parentReference.tag;
    let parentObjectTag = UpdatableTag.create(CONSTANT_TAG);

    this._parentReference = parentReference;
    this._parentObjectTag = parentObjectTag;
    this._propertyKey = propertyKey;

    if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER ||
        EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER) {
      let tag = combine([parentReferenceTag, parentObjectTag]);
      this.tag = new TwoWayFlushDetectionTag(tag, propertyKey, this);
    } else {
      this.tag = combine([parentReferenceTag, parentObjectTag]);
    }
  }

  compute() {
    let { _parentReference, _parentObjectTag, _propertyKey } = this;

    let parentValue = _parentReference.value();

    _parentObjectTag.inner.update(tagForProperty(parentValue, _propertyKey));

    let parentValueType = typeof parentValue;

    if (parentValueType === 'string' && _propertyKey === 'length') {
      return parentValue.length;
    }

    if (parentValueType === 'object' && parentValue !== null || parentValueType === 'function') {
      if (MANDATORY_SETTER) {
        watchKey(parentValue, _propertyKey);
      }

      if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER ||
          EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER) {
        this.tag.didCompute(parentValue);
      }

      return get(parentValue, _propertyKey);
    } else {
      return undefined;
    }
  }

  [UPDATE](value: any) {
    let parent = this._parentReference.value();
    set(parent, this._propertyKey, value);
  }
}

export class UpdatableReference extends EmberPathReference {
  public tag: TagWrapper<DirtyableTag>;
  private _value: any;

  constructor(value: any) {
    super();

    this.tag = DirtyableTag.create();
    this._value = value;
  }

  value() {
    return this._value;
  }

  update(value: any) {
    let { _value } = this;

    if (value !== _value) {
      this.tag.inner.dirty();
      this._value = value;
    }
  }
}

export class UpdatablePrimitiveReference extends UpdatableReference {
}

export class ConditionalReference extends GlimmerConditionalReference {
  public objectTag: TagWrapper<UpdatableTag>;
  static create(reference: UpdatableReference) {
    if (isConst(reference)) {
      let value = reference.value();

      if (isProxy(value)) {
        return new RootPropertyReference(value, 'isTruthy');
      } else {
        return PrimitiveReference.create(emberToBool(value));
      }
    }

    return new ConditionalReference(reference);
  }

  constructor(reference: UpdatableReference) {
    super(reference);

    this.objectTag = UpdatableTag.create(CONSTANT_TAG);
    this.tag = combine([reference.tag, this.objectTag]);
  }

  toBool(predicate: any) {
    if (isProxy(predicate)) {
      this.objectTag.inner.update(tagForProperty(predicate, 'isTruthy'));
      return get(predicate, 'isTruthy');
    } else {
      this.objectTag.inner.update(tagFor(predicate));
      return emberToBool(predicate);
    }
  }
}

export class SimpleHelperReference extends CachedReference {
  public helper: (positionalValue: any, namedValue: any) => any;
  public args: any;

  static create(Helper: SimpleHelperFactory, _vm: VM, args: CapturedArguments) {
    let helper = Helper.create();

    if (isConst(args)) {
      let { positional, named } = args;

      let positionalValue = positional.value();
      let namedValue = named.value();

      if (DEBUG) {
        maybeFreeze(positionalValue);
        maybeFreeze(namedValue);
      }

      let result = helper.compute(positionalValue, namedValue);

      if (typeof result === 'object' && result !== null || typeof result === 'function') {
        return new RootReference(result);
      } else {
        return PrimitiveReference.create(result);
      }
    } else {
      return new SimpleHelperReference(helper.compute, args);
    }
  }

  constructor(helper: (positionalValue: any, namedValue: any) => any, args: CapturedArguments) {
    super();

    this.tag = args.tag;
    this.helper = helper;
    this.args = args;
  }

  compute() {
    let { helper, args: { positional, named } } = this;

    let positionalValue = positional.value();
    let namedValue = named.value();

    if (DEBUG) {
      maybeFreeze(positionalValue);
      maybeFreeze(namedValue);
    }

    return helper(positionalValue, namedValue);
  }
}

export class ClassBasedHelperReference extends CachedReference {
  public instance: any;
  public args: any;

  static create(helperClass: any, vm: VM, args: CapturedArguments) {
    let instance = helperClass.create();
    vm.newDestroyable(instance);
    return new ClassBasedHelperReference(instance, args);
  }

  constructor(instance: any, args: CapturedArguments) {
    super();

    this.tag = combine([instance[RECOMPUTE_TAG], args.tag]);
    this.instance = instance;
    this.args = args;
  }

  compute() {
    let { instance, args: { positional, named } } = this;

    let positionalValue = positional.value();
    let namedValue = named.value();

    if (DEBUG) {
      maybeFreeze(positionalValue);
      maybeFreeze(namedValue);
    }

    return instance.compute(positionalValue, namedValue);
  }
}

export class InternalHelperReference extends CachedReference {
  public helper: (args: CapturedArguments) => CapturedArguments;
  public args: any;

  constructor(helper: (args: CapturedArguments) => any, args: CapturedArguments) {
    super();

    this.tag = args.tag;
    this.helper = helper;
    this.args = args;
  }

  compute() {
    let { helper, args } = this;
    return helper(args);
  }
}

// @implements PathReference
export class UnboundReference extends ConstReference<any> {
  static create(value: any) {
    if (typeof value === 'object' && value !== null) {
      return new UnboundReference(value);
    } else {
      return PrimitiveReference.create(value);
    }
  }

  get(key: string) {
    return new UnboundReference(get(this.inner, key));
  }
}
