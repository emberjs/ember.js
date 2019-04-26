import {
  consume,
  didRender,
  get,
  set,
  tagFor,
  tagForProperty,
  track,
  watchKey,
} from '@ember/-internals/metal';
import { isProxy, symbol } from '@ember/-internals/utils';
import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { debugFreeze } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { Dict, Opaque } from '@glimmer/interfaces';
import {
  combine,
  CONSTANT_TAG,
  ConstReference,
  DirtyableTag,
  isConst,
  Revision,
  RevisionTag,
  Tag,
  TagWrapper,
  UpdatableTag,
  VersionedPathReference,
  VersionedReference,
} from '@glimmer/reference';
import {
  CapturedArguments,
  ConditionalReference as GlimmerConditionalReference,
  PrimitiveReference,
  UNDEFINED_REFERENCE,
} from '@glimmer/runtime';
import { Option, unreachable } from '@glimmer/util';
import { HelperFunction, HelperInstance, RECOMPUTE_TAG } from '../helper';
import emberToBool from './to-bool';

export const UPDATE = symbol('UPDATE');
export const INVOKE = symbol('INVOKE');
export const ACTION = symbol('ACTION');

abstract class EmberPathReference implements VersionedPathReference<Opaque> {
  abstract tag: Tag;

  get(key: string): VersionedPathReference<Opaque> {
    return PropertyReference.create(this, key);
  }

  abstract value(): Opaque;
}

export abstract class CachedReference extends EmberPathReference {
  abstract tag: Tag;
  private lastRevision: Option<Revision>;
  private lastValue: Opaque;

  constructor() {
    super();
    this.lastRevision = null;
    this.lastValue = null;
  }

  abstract compute(): Opaque;

  value(): Opaque {
    let { tag, lastRevision, lastValue } = this;

    if (lastRevision === null || !tag.validate(lastRevision)) {
      lastValue = this.lastValue = this.compute();
      this.lastRevision = tag.value();
    }

    return lastValue;
  }
}

export class RootReference<T extends object> extends ConstReference<T>
  implements VersionedPathReference<T> {
  static create<T>(value: T): VersionedPathReference<T> {
    return valueToRef(value);
  }

  private children: Dict<VersionedPathReference<Opaque>>;

  constructor(value: T) {
    super(value);
    this.children = Object.create(null);
  }

  get(propertyKey: string): VersionedPathReference<Opaque> {
    let ref = this.children[propertyKey];

    if (ref === undefined) {
      ref = this.children[propertyKey] = new RootPropertyReference(this.inner, propertyKey);
    }

    return ref;
  }
}

interface ITwoWayFlushDetectionTag extends RevisionTag {
  didCompute(parent: Opaque): void;
}

let TwoWayFlushDetectionTag: {
  create(
    tag: Tag,
    key: string,
    ref: VersionedPathReference<Opaque>
  ): TagWrapper<ITwoWayFlushDetectionTag>;
};

if (DEBUG) {
  TwoWayFlushDetectionTag = class TwoWayFlushDetectionTag implements ITwoWayFlushDetectionTag {
    static create(
      tag: Tag,
      key: string,
      ref: VersionedPathReference<Opaque>
    ): TagWrapper<TwoWayFlushDetectionTag> {
      return new TagWrapper((tag as any).type, new TwoWayFlushDetectionTag(tag, key, ref));
    }

    private parent: Opaque = null;

    constructor(
      private tag: Tag,
      private key: string,
      private ref: VersionedPathReference<Opaque>
    ) {}

    value(): Revision {
      return this.tag.value();
    }

    validate(ticket: Revision): boolean {
      let { parent, key, ref } = this;

      let isValid = this.tag.validate(ticket);

      if (isValid && parent) {
        didRender(parent, key, ref);
      }

      return isValid;
    }

    didCompute(parent: Opaque): void {
      this.parent = parent;
      didRender(parent, this.key, this.ref);
    }
  };
}

export abstract class PropertyReference extends CachedReference {
  abstract tag: Tag;

  static create(parentReference: VersionedPathReference<Opaque>, propertyKey: string) {
    if (isConst(parentReference)) {
      return valueKeyToRef(parentReference.value(), propertyKey);
    } else {
      return new NestedPropertyReference(parentReference, propertyKey);
    }
  }

  get(key: string): VersionedPathReference<Opaque> {
    return new NestedPropertyReference(this, key);
  }
}

export class RootPropertyReference extends PropertyReference
  implements VersionedPathReference<Opaque> {
  public tag: Tag;
  private propertyTag: TagWrapper<UpdatableTag>;

  constructor(private parentValue: object, private propertyKey: string) {
    super();

    if (EMBER_METAL_TRACKED_PROPERTIES) {
      this.propertyTag = UpdatableTag.create(CONSTANT_TAG);
    } else {
      this.propertyTag = UpdatableTag.create(tagForProperty(parentValue, propertyKey));
    }

    if (DEBUG) {
      this.tag = TwoWayFlushDetectionTag.create(this.propertyTag, propertyKey, this);
    } else {
      this.tag = this.propertyTag;
    }

    if (DEBUG && !EMBER_METAL_TRACKED_PROPERTIES) {
      watchKey(parentValue, propertyKey);
    }
  }

  compute(): Opaque {
    let { parentValue, propertyKey } = this;

    if (DEBUG) {
      (this.tag.inner as ITwoWayFlushDetectionTag).didCompute(parentValue);
    }

    let ret;

    if (EMBER_METAL_TRACKED_PROPERTIES) {
      let tag = track(() => {
        ret = get(parentValue, propertyKey);
      });

      consume(tag);
      this.propertyTag.inner.update(tag);
    } else {
      ret = get(parentValue, propertyKey);
    }

    return ret;
  }

  [UPDATE](value: Opaque): void {
    set(this.parentValue, this.propertyKey, value);
  }
}

export class NestedPropertyReference extends PropertyReference {
  public tag: Tag;
  private propertyTag: TagWrapper<UpdatableTag>;

  constructor(
    private parentReference: VersionedPathReference<Opaque>,
    private propertyKey: string
  ) {
    super();

    let parentReferenceTag = parentReference.tag;
    let propertyTag = (this.propertyTag = UpdatableTag.create(CONSTANT_TAG));

    if (DEBUG) {
      let tag = combine([parentReferenceTag, propertyTag]);
      this.tag = TwoWayFlushDetectionTag.create(tag, propertyKey, this);
    } else {
      this.tag = combine([parentReferenceTag, propertyTag]);
    }
  }

  compute(): Opaque {
    let { parentReference, propertyTag, propertyKey } = this;

    let _parentValue = parentReference.value();
    let parentValueType = typeof _parentValue;

    if (parentValueType === 'string' && propertyKey === 'length') {
      return (_parentValue as string).length;
    }

    if ((parentValueType === 'object' && _parentValue !== null) || parentValueType === 'function') {
      let parentValue = _parentValue as object;

      if (DEBUG && !EMBER_METAL_TRACKED_PROPERTIES) {
        watchKey(parentValue, propertyKey);
      }

      if (DEBUG) {
        (this.tag.inner as ITwoWayFlushDetectionTag).didCompute(parentValue);
      }

      let ret;

      if (EMBER_METAL_TRACKED_PROPERTIES) {
        let tag = track(() => {
          ret = get(parentValue, propertyKey);
        });

        consume(tag);

        propertyTag.inner.update(tag);
      } else {
        ret = get(parentValue, propertyKey);
        propertyTag.inner.update(tagForProperty(parentValue, propertyKey));
      }

      return ret;
    } else {
      return undefined;
    }
  }

  [UPDATE](value: Opaque): void {
    set(
      this.parentReference.value() as object /* let the other side handle the error */,
      this.propertyKey,
      value
    );
  }
}

export class UpdatableReference extends EmberPathReference {
  public tag: TagWrapper<DirtyableTag>;
  private _value: Opaque;

  constructor(value: Opaque) {
    super();

    this.tag = DirtyableTag.create();
    this._value = value;
  }

  value(): Opaque {
    return this._value;
  }

  update(value: Opaque): void {
    let { _value } = this;

    if (value !== _value) {
      this.tag.inner.dirty();
      this._value = value;
    }
  }
}

export class ConditionalReference extends GlimmerConditionalReference
  implements VersionedReference<boolean> {
  public objectTag: TagWrapper<UpdatableTag>;
  static create(reference: VersionedReference<Opaque>): VersionedReference<boolean> {
    if (isConst(reference)) {
      let value = reference.value();

      if (!isProxy(value)) {
        return PrimitiveReference.create(emberToBool(value));
      }
    }

    return new ConditionalReference(reference);
  }

  constructor(reference: VersionedReference<Opaque>) {
    super(reference);
    this.objectTag = UpdatableTag.create(CONSTANT_TAG);
    this.tag = combine([reference.tag, this.objectTag]);
  }

  toBool(predicate: Opaque): boolean {
    if (isProxy(predicate)) {
      this.objectTag.inner.update(tagForProperty(predicate, 'isTruthy'));
      return Boolean(get(predicate, 'isTruthy'));
    } else {
      this.objectTag.inner.update(tagFor(predicate));
      return emberToBool(predicate);
    }
  }
}

export class SimpleHelperReference extends CachedReference {
  static create(helper: HelperFunction, args: CapturedArguments) {
    if (isConst(args)) {
      let { positional, named } = args;

      let positionalValue = positional.value();
      let namedValue = named.value();

      if (DEBUG) {
        debugFreeze(positionalValue);
        debugFreeze(namedValue);
      }

      let result = helper(positionalValue, namedValue);
      return valueToRef(result);
    } else {
      return new SimpleHelperReference(helper, args);
    }
  }

  public tag: Tag;

  constructor(private helper: HelperFunction, private args: CapturedArguments) {
    super();
    this.tag = args.tag;
  }

  compute(): Opaque {
    let {
      helper,
      args: { positional, named },
    } = this;

    let positionalValue = positional.value();
    let namedValue = named.value();

    if (DEBUG) {
      debugFreeze(positionalValue);
      debugFreeze(namedValue);
    }

    return helper(positionalValue, namedValue);
  }
}

export class ClassBasedHelperReference extends CachedReference {
  static create(instance: HelperInstance, args: CapturedArguments) {
    return new ClassBasedHelperReference(instance, args);
  }

  public tag: Tag;

  constructor(private instance: HelperInstance, private args: CapturedArguments) {
    super();
    this.tag = combine([instance[RECOMPUTE_TAG], args.tag]);
  }

  compute(): Opaque {
    let {
      instance,
      args: { positional, named },
    } = this;

    let positionalValue = positional.value();
    let namedValue = named.value();

    if (DEBUG) {
      debugFreeze(positionalValue);
      debugFreeze(namedValue);
    }

    return instance.compute(positionalValue, namedValue);
  }
}

export class InternalHelperReference extends CachedReference {
  public tag: Tag;

  constructor(
    private helper: (args: CapturedArguments) => Opaque,
    private args: CapturedArguments
  ) {
    super();
    this.tag = args.tag;
  }

  compute(): Opaque {
    let { helper, args } = this;
    return helper(args);
  }
}

export class UnboundReference<T extends object> extends ConstReference<T> {
  static create<T>(value: T): VersionedPathReference<T> {
    return valueToRef(value, false);
  }

  get(key: string): VersionedPathReference<Opaque> {
    return valueToRef(this.inner[key], false);
  }
}

export class ReadonlyReference extends CachedReference {
  public tag: Tag;

  constructor(private inner: VersionedPathReference<Opaque>) {
    super();
    this.tag = inner.tag;
  }

  get [INVOKE](): Function | undefined {
    return this.inner[INVOKE];
  }

  compute(): Opaque {
    return this.inner.value();
  }

  get(key: string): VersionedPathReference {
    return this.inner.get(key);
  }
}

export function referenceFromParts(
  root: VersionedPathReference<Opaque>,
  parts: string[]
): VersionedPathReference<Opaque> {
  let reference = root;

  for (let i = 0; i < parts.length; i++) {
    reference = reference.get(parts[i]);
  }

  return reference;
}

type Primitive = undefined | null | boolean | number | string;

function isObject(value: Opaque): value is object {
  return value !== null && typeof value === 'object';
}

function isFunction(value: Opaque): value is Function {
  return typeof value === 'function';
}

function isPrimitive(value: Opaque): value is Primitive {
  if (DEBUG) {
    let type = typeof value;
    return (
      value === undefined ||
      value === null ||
      type === 'boolean' ||
      type === 'number' ||
      type === 'string'
    );
  } else {
    return true;
  }
}

function valueToRef<T = Opaque>(value: T, bound = true): VersionedPathReference<T> {
  if (isObject(value)) {
    // root of interop with ember objects
    return bound ? new RootReference(value) : new UnboundReference(value);
  } else if (isFunction(value)) {
    // ember doesn't do observing with functions
    return new UnboundReference(value);
  } else if (isPrimitive(value)) {
    return PrimitiveReference.create(value);
  } else if (DEBUG) {
    let type = typeof value;
    let output: Option<string>;

    try {
      output = String(value);
    } catch (e) {
      output = null;
    }

    if (output) {
      throw unreachable(`[BUG] Unexpected ${type} (${output})`);
    } else {
      throw unreachable(`[BUG] Unexpected ${type}`);
    }
  } else {
    throw unreachable();
  }
}

function valueKeyToRef(value: Opaque, key: string): VersionedPathReference<Opaque> {
  if (isObject(value)) {
    // root of interop with ember objects
    return new RootPropertyReference(value, key);
  } else if (isFunction(value)) {
    // ember doesn't do observing with functions
    return new UnboundReference(value[key]);
  } else if (isPrimitive(value)) {
    return UNDEFINED_REFERENCE;
  } else if (DEBUG) {
    let type = typeof value;
    let output: Option<string>;

    try {
      output = String(value);
    } catch (e) {
      output = null;
    }

    if (output) {
      throw unreachable(`[BUG] Unexpected ${type} (${output})`);
    } else {
      throw unreachable(`[BUG] Unexpected ${type}`);
    }
  } else {
    throw unreachable();
  }
}
