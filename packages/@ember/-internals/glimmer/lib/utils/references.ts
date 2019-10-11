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
import { assert, debugFreeze } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { Dict, Opaque } from '@glimmer/interfaces';
import {
  combine,
  COMPUTE,
  ConstReference,
  createTag,
  createUpdatableTag,
  dirty,
  DirtyableTag,
  isConst,
  Revision,
  Tag,
  UpdatableTag,
  update,
  validate,
  value,
  VersionedPathReference,
  VersionedReference,
} from '@glimmer/reference';
import {
  CapturedArguments,
  CapturedPositionalArguments,
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

    if (lastRevision === null || !validate(tag, lastRevision)) {
      lastValue = this.lastValue = this.compute();
      this.lastRevision = value(tag);
    }

    return lastValue;
  }
}

export class EmberCapturedArrayReference implements VersionedPathReference<Opaque[]> {
  public tag: Tag;
  public references: VersionedPathReference<Opaque>[];
  public length: number;

  constructor(args: CapturedPositionalArguments) {
    this.tag = args.tag;
    this.references = args.references;
    this.length = args.length;
  }

  private valueOf(this: void, reference: VersionedPathReference<Opaque>): Opaque {
    return reference.value();
  }

  value(): Opaque[] {
    return this.references.map(this.valueOf);
  }

  get(name: string): VersionedPathReference<Opaque> {
    let { references, length } = this;

    if (name === 'length') {
      return PrimitiveReference.create(length);
    }

    if (length === 0) {
      return UNDEFINED_REFERENCE;
    }

    if (name === 'firstObject') {
      return references[0];
    } else if (name === 'lastObject') {
      return references[length - 1];
    } else {
      let idx = parseInt(name, 10);

      if (idx < 0 || idx >= length) {
        return UNDEFINED_REFERENCE;
      } else {
        return references[idx];
      }
    }
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

let TwoWayFlushDetectionTag: {
  create(tag: Tag, key: string, ref: VersionedPathReference<Opaque>): Tag;
};

if (DEBUG) {
  TwoWayFlushDetectionTag = class TwoWayFlushDetectionTag {
    static create(tag: Tag, key: string, ref: VersionedPathReference<Opaque>): Tag {
      return (new TwoWayFlushDetectionTag(tag, key, ref) as unknown) as Tag;
    }

    constructor(
      private tag: Tag,
      private key: string,
      private ref: VersionedPathReference<Opaque>
    ) {}

    [COMPUTE](): Revision {
      return this.tag[COMPUTE]();
    }

    didCompute(parent: Opaque): void {
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
  private propertyTag: UpdatableTag;

  constructor(private parentValue: object, private propertyKey: string) {
    super();

    if (EMBER_METAL_TRACKED_PROPERTIES) {
      this.propertyTag = createUpdatableTag();
    } else {
      let tag = (this.propertyTag = createUpdatableTag());
      update(tag, tagForProperty(parentValue, propertyKey));
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
      (this.tag as any).didCompute(parentValue);
    }

    let ret;

    if (EMBER_METAL_TRACKED_PROPERTIES) {
      let tag = track(() => {
        ret = get(parentValue, propertyKey);
      });

      consume(tag);
      update(this.propertyTag, tag);
    } else {
      ret = get(parentValue, propertyKey);
    }

    return ret;
  }

  [UPDATE](value: Opaque): void {
    set(this.parentValue, this.propertyKey, value);
  }
}

if (DEBUG) {
  RootPropertyReference.prototype['debug'] = function debug(): string {
    return `this.${this['propertyKey']}`;
  };
}

export class NestedPropertyReference extends PropertyReference {
  public tag: Tag;
  private propertyTag: UpdatableTag;

  constructor(
    private parentReference: VersionedPathReference<Opaque>,
    private propertyKey: string
  ) {
    super();

    let parentReferenceTag = parentReference.tag;
    let propertyTag = (this.propertyTag = createUpdatableTag());

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
        (this.tag as any).didCompute(parentValue);
      }

      let ret;

      if (EMBER_METAL_TRACKED_PROPERTIES) {
        let tag = track(() => {
          ret = get(parentValue, propertyKey);
        });

        consume(tag);

        update(propertyTag, tag);
      } else {
        ret = get(parentValue, propertyKey);
        update(propertyTag, tagForProperty(parentValue, propertyKey));
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

if (DEBUG) {
  NestedPropertyReference.prototype['debug'] = function debug(): string {
    let parent = this['parentReference'];
    let parentKey = 'unknownObject';
    let selfKey = this['propertyKey'];

    if (typeof parent['debug'] === 'function') {
      parentKey = parent['debug']();
    }

    return `${parentKey}.${selfKey}`;
  };
}

export class UpdatableReference extends EmberPathReference {
  public tag: DirtyableTag;
  private _value: Opaque;

  constructor(value: Opaque) {
    super();

    this.tag = createTag();
    this._value = value;
  }

  value(): Opaque {
    return this._value;
  }

  update(value: Opaque): void {
    let { _value } = this;

    if (value !== _value) {
      dirty(this.tag);
      this._value = value;
    }
  }
}

export class ConditionalReference extends GlimmerConditionalReference
  implements VersionedReference<boolean> {
  public objectTag: UpdatableTag;
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
    this.objectTag = createUpdatableTag();
    this.tag = combine([reference.tag, this.objectTag]);
  }

  toBool(predicate: Opaque): boolean {
    if (isProxy(predicate)) {
      update(this.objectTag, tagForProperty(predicate, 'isTruthy'));
      return Boolean(get(predicate, 'isTruthy'));
    } else {
      update(this.objectTag, tagFor(predicate));
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

  private computeTag: UpdatableTag;
  public tag: Tag;

  constructor(private helper: HelperFunction, private args: CapturedArguments) {
    super();

    let computeTag = (this.computeTag = createUpdatableTag());
    this.tag = combine([args.tag, computeTag]);
  }

  compute(): Opaque {
    let {
      helper,
      computeTag,
      args: { positional, named },
    } = this;

    let positionalValue = positional.value();
    let namedValue = named.value();

    if (DEBUG) {
      debugFreeze(positionalValue);
      debugFreeze(namedValue);
    }

    let computedValue;
    let combinedTrackingTag = track(() => (computedValue = helper(positionalValue, namedValue)));

    update(computeTag, combinedTrackingTag);

    return computedValue;
  }
}

export class ClassBasedHelperReference extends CachedReference {
  static create(instance: HelperInstance, args: CapturedArguments) {
    return new ClassBasedHelperReference(instance, args);
  }

  private computeTag: UpdatableTag;
  public tag: Tag;

  constructor(private instance: HelperInstance, private args: CapturedArguments) {
    super();

    let computeTag = (this.computeTag = createUpdatableTag());
    this.tag = combine([instance[RECOMPUTE_TAG], args.tag, computeTag]);
  }

  compute(): Opaque {
    let {
      instance,
      computeTag,
      args: { positional, named },
    } = this;

    let positionalValue = positional.value();
    let namedValue = named.value();

    if (DEBUG) {
      debugFreeze(positionalValue);
      debugFreeze(namedValue);
    }

    let computedValue;
    let combinedTrackingTag = track(
      () => (computedValue = instance.compute(positionalValue, namedValue))
    );

    update(computeTag, combinedTrackingTag);

    return computedValue;
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

function isObject(value: unknown): value is object {
  return value !== null && typeof value === 'object';
}

function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

function isPrimitive(value: unknown): value is Primitive {
  if (DEBUG) {
    let label;

    try {
      label = ` (was \`${String(value)}\`)`;
    } catch (e) {
      label = null;
    }

    assert(
      `This is a fall-through check for typing purposes only! \`value\` must already be a primitive at this point.${label})`,
      value === undefined ||
        value === null ||
        typeof value === 'boolean' ||
        typeof value === 'number' ||
        typeof value === 'string'
    );
  }

  return true;
}

function valueToRef<T = unknown>(value: T, bound = true): VersionedPathReference<T> {
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

function valueKeyToRef(value: unknown, key: string): VersionedPathReference<Opaque> {
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
