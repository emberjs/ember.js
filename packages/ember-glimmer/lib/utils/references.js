import {
  HAS_NATIVE_WEAKMAP,
  symbol
} from 'ember-utils';
import {
  get,
  set,
  tagForProperty,
  tagFor,
  didRender,
  watchKey,
  isFeatureEnabled,
  runInDebug,
  isProxy
} from 'ember-metal';
import {
  CONSTANT_TAG,
  ConstReference,
  DirtyableTag,
  UpdatableTag,
  combine,
  isConst
} from '@glimmer/reference';
import {
  ConditionalReference as GlimmerConditionalReference,
  PrimitiveReference,
  NULL_REFERENCE,
  UNDEFINED_REFERENCE
} from '@glimmer/runtime';
import emberToBool from './to-bool';
import { RECOMPUTE_TAG } from '../helper';

export const UPDATE = symbol('UPDATE');

export { NULL_REFERENCE, UNDEFINED_REFERENCE } from '@glimmer/runtime';

// @abstract
// @implements PathReference
class EmberPathReference {
  // @abstract get tag()
  // @abstract value()

  get(key) {
    return PropertyReference.create(this, key);
  }
}

// @abstract
export class CachedReference extends EmberPathReference {
  constructor() {
    super();
    this._lastRevision = null;
    this._lastValue = null;
  }

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
export class RootReference extends ConstReference {
  constructor(value) {
    super(value);
    this.children = Object.create(null);
  }

  get(propertyKey) {
    let ref = this.children[propertyKey];

    if (!ref) {
      ref = this.children[propertyKey] = new RootPropertyReference(this.inner, propertyKey);
    }

    return ref;
  }
}

let TwoWayFlushDetectionTag;

if (isFeatureEnabled('ember-glimmer-detect-backtracking-rerender') ||
    isFeatureEnabled('ember-glimmer-allow-backtracking-rerender')) {
  TwoWayFlushDetectionTag = class {
    constructor(tag, key, ref) {
      this.tag = tag;
      this.parent = null;
      this.key = key;
      this.ref = ref;
    }

    value() {
      return this.tag.value();
    }

    validate(ticket) {
      let { parent, key } = this;

      let isValid = this.tag.validate(ticket);

      if (isValid && parent) {
        didRender(parent, key, this.ref);
      }

      return isValid;
    }

    didCompute(parent) {
      this.parent = parent;
      didRender(parent, this.key, this.ref);
    }
  };
}

export class PropertyReference extends CachedReference {
  static create(parentReference, propertyKey) {
    if (isConst(parentReference)) {
      return new RootPropertyReference(parentReference.value(), propertyKey);
    } else {
      return new NestedPropertyReference(parentReference, propertyKey);
    }
  }

  get(key) {
    return new NestedPropertyReference(this, key);
  }
}

export class RootPropertyReference extends PropertyReference {
  constructor(parentValue, propertyKey) {
    super();

    this._parentValue = parentValue;
    this._propertyKey = propertyKey;

    if (isFeatureEnabled('ember-glimmer-detect-backtracking-rerender') ||
        isFeatureEnabled('ember-glimmer-allow-backtracking-rerender')) {
      this.tag = new TwoWayFlushDetectionTag(tagForProperty(parentValue, propertyKey), propertyKey, this);
    } else {
      this.tag = tagForProperty(parentValue, propertyKey);
    }

    if (isFeatureEnabled('mandatory-setter')) {
      watchKey(parentValue, propertyKey);
    }
  }

  compute() {
    let { _parentValue, _propertyKey } = this;

    if (isFeatureEnabled('ember-glimmer-detect-backtracking-rerender') ||
        isFeatureEnabled('ember-glimmer-allow-backtracking-rerender')) {
      this.tag.didCompute(_parentValue);
    }

    return get(_parentValue, _propertyKey);
  }

  [UPDATE](value) {
    set(this._parentValue, this._propertyKey, value);
  }
}

export class NestedPropertyReference extends PropertyReference {
  constructor(parentReference, propertyKey) {
    super();

    let parentReferenceTag = parentReference.tag;
    let parentObjectTag = new UpdatableTag(CONSTANT_TAG);

    this._parentReference = parentReference;
    this._parentObjectTag = parentObjectTag;
    this._propertyKey = propertyKey;

    if (isFeatureEnabled('ember-glimmer-detect-backtracking-rerender') ||
        isFeatureEnabled('ember-glimmer-allow-backtracking-rerender')) {
      let tag = combine([parentReferenceTag, parentObjectTag]);
      this.tag = new TwoWayFlushDetectionTag(tag, propertyKey, this);
    } else {
      this.tag = combine([parentReferenceTag, parentObjectTag]);
    }
  }

  compute() {
    let { _parentReference, _parentObjectTag, _propertyKey } = this;

    let parentValue = _parentReference.value();

    _parentObjectTag.update(tagForProperty(parentValue, _propertyKey));

    if (typeof parentValue === 'string' && _propertyKey === 'length') {
      return parentValue.length;
    }

    if (typeof parentValue === 'object' && parentValue) {
      if (isFeatureEnabled('mandatory-setter')) {
        watchKey(parentValue, _propertyKey);
      }

      if (isFeatureEnabled('ember-glimmer-detect-backtracking-rerender') ||
          isFeatureEnabled('ember-glimmer-allow-backtracking-rerender')) {
        this.tag.didCompute(parentValue);
      }

      return get(parentValue, _propertyKey);
    } else {
      return undefined;
    }
  }

  [UPDATE](value) {
    let parent = this._parentReference.value();
    set(parent, this._propertyKey, value);
  }
}

export class UpdatableReference extends EmberPathReference {
  constructor(value) {
    super();

    this.tag = new DirtyableTag();
    this._value = value;
  }

  value() {
    return this._value;
  }

  update(value) {
    let { _value } = this;

    if (value !== _value) {
      this.tag.dirty();
      this._value = value;
    }
  }
}

export class UpdatablePrimitiveReference extends UpdatableReference {
  get() {
    return UNDEFINED_REFERENCE;
  }
}

export class ConditionalReference extends GlimmerConditionalReference {
  static create(reference) {
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

  constructor(reference) {
    super(reference);

    this.objectTag = new UpdatableTag(CONSTANT_TAG);
    this.tag = combine([reference.tag, this.objectTag]);
  }

  toBool(predicate) {
    if (isProxy(predicate)) {
      this.objectTag.update(tagForProperty(predicate, 'isTruthy'));
      return get(predicate, 'isTruthy');
    } else {
      this.objectTag.update(tagFor(predicate));
      return emberToBool(predicate);
    }
  }
}

export class SimpleHelperReference extends CachedReference {
  static create(helper, args) {
    if (isConst(args)) {
      let { positional, named } = args;

      let positionalValue = positional.value();
      let namedValue = named.value();

      runInDebug(() => {
        if (HAS_NATIVE_WEAKMAP) {
          Object.freeze(positionalValue);
          Object.freeze(namedValue);
        }
      });

      let result = helper(positionalValue, namedValue);

      if (result === null) {
        return NULL_REFERENCE;
      } else if (result === undefined) {
        return UNDEFINED_REFERENCE;
      } else if (typeof result === 'object') {
        return new RootReference(result);
      } else {
        return PrimitiveReference.create(result);
      }
    } else {
      return new SimpleHelperReference(helper, args);
    }
  }

  constructor(helper, args) {
    super();

    this.tag = args.tag;
    this.helper = helper;
    this.args = args;
  }

  compute() {
    let { helper, args: { positional, named } } = this;

    let positionalValue = positional.value();
    let namedValue = named.value();

    runInDebug(() => {
      if (HAS_NATIVE_WEAKMAP) {
        Object.freeze(positionalValue);
        Object.freeze(namedValue);
      }
    });

    return helper(positionalValue, namedValue);
  }
}

export class ClassBasedHelperReference extends CachedReference {
  static create(helperClass, vm, args) {
    let instance = helperClass.create();
    vm.newDestroyable(instance);
    return new ClassBasedHelperReference(instance, args);
  }

  constructor(instance, args) {
    super();

    this.tag = combine([instance[RECOMPUTE_TAG], args.tag]);
    this.instance = instance;
    this.args = args;
  }

  compute() {
    let { instance, args: { positional, named } } = this;

    let positionalValue = positional.value();
    let namedValue = named.value();

    runInDebug(() => {
      if (HAS_NATIVE_WEAKMAP) {
        Object.freeze(positionalValue);
        Object.freeze(namedValue);
      }
    });

    return instance.compute(positionalValue, namedValue);
  }
}

export class InternalHelperReference extends CachedReference {
  constructor(helper, args) {
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
export class UnboundReference extends ConstReference {
  static create(value) {
    if (value === null) {
      return NULL_REFERENCE;
    } else if (value === undefined) {
      return UNDEFINED_REFERENCE;
    } else if (typeof value === 'object') {
      return new UnboundReference(value);
    } else {
      return PrimitiveReference.create(value);
    }
  }

  get(key) {
    return new UnboundReference(get(this.inner, key));
  }
}
