import { Opaque } from '@glimmer/interfaces';
import {
  combine,
  CONSTANT_TAG,
  ConstReference,
  DirtyableTag,
  isConst,
  RevisionTag,
  Tag,
  TagWrapper,
  UpdatableTag,
  VersionedPathReference,
} from '@glimmer/reference';
import {
  CapturedArguments,
  ConditionalReference as GlimmerConditionalReference,
  PrimitiveReference,
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
  symbol,
} from 'ember-utils';
import {
  EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER,
  MANDATORY_SETTER,
} from 'ember/features';
import {
  HelperFunction,
  HelperInstance,
  RECOMPUTE_TAG,
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
    if (!Object.isFrozen(obj)) {
      Object.freeze(obj);
    }
  };
}

// @abstract
// @implements PathReference
abstract class EmberPathReference implements VersionedPathReference<Opaque> {
  // @abstract get tag()
  // @abstract value()
  public tag: Tag;

  get(key: string): any {
    return PropertyReference.create(this, key);
  }

  abstract value(): Opaque;
}

// @abstract
export class CachedReference extends EmberPathReference {
  private _lastRevision: any;
  private _lastValue: any;
  public tag: Tag;

  constructor() {
    super();
    this._lastRevision = null;
    this._lastValue = null;
  }

  compute() { /* NOOP */ }

  value() {
    let { tag, _lastRevision, _lastValue } = this;

    if (_lastRevision === null || !tag.validate(_lastRevision)) {
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

interface TwoWayFlushDetectionTag extends RevisionTag {
  didCompute(parent: Opaque): void;
}

let TwoWayFlushDetectionTag: {
  new (tag: Tag, key: string, ref: VersionedPathReference<Opaque>): TwoWayFlushDetectionTag;
  create(tag: Tag, key: string, ref: VersionedPathReference<Opaque>): TagWrapper<TwoWayFlushDetectionTag>;
};

if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER) {
  TwoWayFlushDetectionTag = class {
    public tag: Tag;
    public parent: Opaque;
    public key: string;
    public ref: any;

    static create(tag: Tag, key: string, ref: VersionedPathReference<Opaque>): TagWrapper<TwoWayFlushDetectionTag> {
      return new TagWrapper((tag as any).type, new TwoWayFlushDetectionTag(tag, key, ref));
    }

    constructor(tag: Tag, key: string, ref: any) {
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
  static create(parentReference: VersionedPathReference<Opaque>, propertyKey: string) {
    if (isConst(parentReference)) {
      return new RootPropertyReference(parentReference.value(), propertyKey);
    } else {
      return new NestedPropertyReference(parentReference, propertyKey);
    }
  }

  get(key: string): VersionedPathReference<Opaque> {
    return new NestedPropertyReference(this, key);
  }
}

export class RootPropertyReference extends PropertyReference implements VersionedPathReference<Opaque> {
  private _parentValue: any;
  private _propertyKey: string;

  constructor(parentValue: any, propertyKey: string) {
    super();

    this._parentValue = parentValue;
    this._propertyKey = propertyKey;

    if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER) {
      this.tag = TwoWayFlushDetectionTag.create(tagForProperty(parentValue, propertyKey), propertyKey, this);
    } else {
      this.tag = tagForProperty(parentValue, propertyKey);
    }

    if (MANDATORY_SETTER) {
      watchKey(parentValue, propertyKey);
    }
  }

  compute() {
    let { _parentValue, _propertyKey } = this;

    if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER) {
      (this.tag.inner as TwoWayFlushDetectionTag).didCompute(_parentValue);
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

  constructor(parentReference: VersionedPathReference<Opaque>, propertyKey: string) {
    super();

    let parentReferenceTag = parentReference.tag;
    let parentObjectTag = UpdatableTag.create(CONSTANT_TAG);

    this._parentReference = parentReference;
    this._parentObjectTag = parentObjectTag;
    this._propertyKey = propertyKey;

    if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER) {
      let tag = combine([parentReferenceTag, parentObjectTag]);
      this.tag = TwoWayFlushDetectionTag.create(tag, propertyKey, this);
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

      if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER) {
        (this.tag.inner as TwoWayFlushDetectionTag).didCompute(parentValue);
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
  public helper: HelperFunction;
  public args: CapturedArguments;

  static create(helper: HelperFunction, args: CapturedArguments) {
    if (isConst(args)) {
      let { positional, named } = args;

      let positionalValue = positional.value();
      let namedValue = named.value();

      if (DEBUG) {
        maybeFreeze(positionalValue);
        maybeFreeze(namedValue);
      }

      let result = helper(positionalValue, namedValue);
      return valueToRef(result);
    } else {
      return new SimpleHelperReference(helper, args);
    }
  }

  constructor(helper: HelperFunction, args: CapturedArguments) {
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
  public instance: HelperInstance;
  public args: CapturedArguments;

  static create(instance: HelperInstance, args: CapturedArguments) {
    return new ClassBasedHelperReference(instance, args);
  }

  constructor(instance: HelperInstance, args: CapturedArguments) {
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
export class UnboundReference<T> extends ConstReference<T> {
  static create<T>(value: T): VersionedPathReference<T> {
    return valueToRef(value, false);
  }

  get(key: string) {
    return valueToRef(get(this.inner, key), false);
  }
}

export function referenceFromParts(root: VersionedPathReference<Opaque>, parts: string[]): VersionedPathReference<Opaque> {
  let reference = root;

  for (let i = 0; i< parts.length; i++) {
    reference = reference.get(parts[i]);
  }

  return reference;
}

export function valueToRef(value: any | null | undefined, bound = true): VersionedPathReference<any | null | undefined> {
  if (value !== null && typeof value === 'object') {
    // root of interop with ember objects
    return bound ? new RootReference(value) : new UnboundReference(value);
  }
  // ember doesn't do observing with functions
  if (typeof value === 'function') {
    return new UnboundReference(value);
  }
  return PrimitiveReference.create(value);
}
