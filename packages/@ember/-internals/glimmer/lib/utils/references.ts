import {
  consume,
  deprecateMutationsInAutotrackingTransaction,
  get,
  set,
  tagFor,
  tagForProperty,
  track,
} from '@ember/-internals/metal';
import { getDebugName, isProxy, symbol } from '@ember/-internals/utils';
import { assert, debugFreeze } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { CapturedArguments, Dict, Option } from '@glimmer/interfaces';
import {
  ConstReference,
  VersionedPathReference,
  VersionedReference,
} from '@glimmer/reference';
import {
  ConditionalReference as GlimmerConditionalReference,
  PrimitiveReference,
  UNDEFINED_REFERENCE,
} from '@glimmer/runtime';
import {
  combine,
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
} from '@glimmer/validator';
import Environment from '../environment';
import { HelperFunction, HelperInstance, RECOMPUTE_TAG } from '../helper';
import debugRenderMessage from './debug-render-message';
import emberToBool from './to-bool';

export const UPDATE = symbol('UPDATE');
export const INVOKE = symbol('INVOKE');
export const ACTION = symbol('ACTION');

abstract class EmberPathReference implements VersionedPathReference<unknown> {
  abstract tag: Tag;

  get(key: string): VersionedPathReference<unknown> {
    return PropertyReference.create(this, key);
  }

  abstract value(): unknown;
}

export abstract class CachedReference extends EmberPathReference {
  abstract tag: Tag;
  private lastRevision: Option<Revision>;
  private lastValue: unknown;

  constructor() {
    super();
    this.lastRevision = null;
    this.lastValue = null;
  }

  abstract compute(): unknown;

  value(): unknown {
    let { tag, lastRevision, lastValue } = this;

    if (lastRevision === null || !validate(tag, lastRevision)) {
      lastValue = this.lastValue = this.compute();
      this.lastRevision = value(tag);
    }

    return lastValue;
  }
}

export class RootReference<T extends object> extends ConstReference<T>
  implements VersionedPathReference<T> {
  static create<T>(value: T, env?: Environment): VersionedPathReference<T> {
    return valueToRef(value, true, env);
  }

  private children: Dict<VersionedPathReference<unknown>>;

  constructor(value: T, private env?: Environment) {
    super(value);
    this.children = Object.create(null);
  }

  get(propertyKey: string): VersionedPathReference<unknown> {
    let ref = this.children[propertyKey];

    if (ref === undefined) {
      ref = this.children[propertyKey] = new RootPropertyReference(
        this.inner,
        propertyKey,
        this.env
      );
    }

    return ref;
  }
}

export abstract class PropertyReference extends CachedReference {
  abstract tag: Tag;

  static create(parentReference: VersionedPathReference<unknown>, propertyKey: string) {
    if (isConst(parentReference)) {
      return valueKeyToRef(parentReference.value(), propertyKey);
    } else {
      return new NestedPropertyReference(parentReference, propertyKey);
    }
  }

  get(key: string): VersionedPathReference<unknown> {
    return new NestedPropertyReference(this, key);
  }
}

export class RootPropertyReference extends PropertyReference
  implements VersionedPathReference<unknown> {
  public tag: Tag;
  private propertyTag: UpdatableTag;
  private debugStackLog?: string;

  constructor(private parentValue: object, private propertyKey: string, env?: Environment) {
    super();

    if (DEBUG) {
      // Capture the stack when this reference is created, as that is the
      // component/context that the component was created _in_. Later, it could
      // be accessed from any number of components.
      this.debugStackLog = env ? env.debugRenderTree.logCurrentRenderStack() : '';
    }

    this.propertyTag = createUpdatableTag();

    this.tag = this.propertyTag;
  }

  compute(): unknown {
    let { parentValue, propertyKey } = this;

    let ret;

    let tag = track(
      () => (ret = get(parentValue, propertyKey)),
      DEBUG && debugRenderMessage!(this['debug']())
    );

    consume(tag);
    update(this.propertyTag, tag);

    return ret;
  }

  [UPDATE](value: unknown): void {
    set(this.parentValue, this.propertyKey, value);
  }
}

if (DEBUG) {
  RootPropertyReference.prototype['debug'] = function debug(subPath?: string): string {
    let path = `this.${this['propertyKey']}`;

    if (subPath) {
      path += `.${subPath}`;
    }

    return `${this['debugStackLog']}${path}`;
  };
}

export class NestedPropertyReference extends PropertyReference {
  public tag: Tag;
  private propertyTag: UpdatableTag;

  constructor(
    private parentReference: VersionedPathReference<unknown>,
    private propertyKey: string
  ) {
    super();

    let parentReferenceTag = parentReference.tag;
    let propertyTag = (this.propertyTag = createUpdatableTag());

    this.tag = combine([parentReferenceTag, propertyTag]);
  }

  compute(): unknown {
    let { parentReference, propertyTag, propertyKey } = this;

    let _parentValue = parentReference.value();
    let parentValueType = typeof _parentValue;

    if (parentValueType === 'string' && propertyKey === 'length') {
      return (_parentValue as string).length;
    }

    if ((parentValueType === 'object' && _parentValue !== null) || parentValueType === 'function') {
      let parentValue = _parentValue as object;

      let ret;

      let tag = track(
        () => (ret = get(parentValue, propertyKey)),
        DEBUG && debugRenderMessage!(this['debug']())
      );

      consume(tag);

      update(propertyTag, tag);

      return ret;
    } else {
      return undefined;
    }
  }

  [UPDATE](value: unknown): void {
    set(
      this.parentReference.value() as object /* let the other side handle the error */,
      this.propertyKey,
      value
    );
  }
}

if (DEBUG) {
  NestedPropertyReference.prototype['debug'] = function debug(subPath?: string): string {
    let parent = this['parentReference'];
    let path = subPath ? `${this['propertyKey']}.${subPath}` : this['propertyKey'];

    if (typeof parent['debug'] === 'function') {
      return parent['debug'](path);
    } else {
      return `unknownObject.${path}`;
    }
  };
}

export class UpdatableReference extends EmberPathReference {
  public tag: DirtyableTag;
  private _value: unknown;

  constructor(value: unknown) {
    super();

    this.tag = createTag();
    this._value = value;
  }

  value(): unknown {
    return this._value;
  }

  update(value: unknown): void {
    let { _value } = this;

    if (value !== _value) {
      dirty(this.tag);
      this._value = value;
    }
  }
}

// export class ConditionalReference extends GlimmerConditionalReference
//   implements VersionedReference<boolean> {
//   public objectTag: UpdatableTag;
//   static create(reference: VersionedReference<unknown>): VersionedReference<boolean> {
//     if (isConst(reference)) {
//       let value = reference.value();

//       if (!isProxy(value)) {
//         return PrimitiveReference.create(emberToBool(value));
//       }
//     }

//     return new ConditionalReference(reference);
//   }

//   constructor(reference: VersionedReference<unknown>) {
//     super(reference);
//     this.objectTag = createUpdatableTag();
//     this.tag = combine([reference.tag, this.objectTag]);
//   }

//   toBool(predicate: unknown): boolean {
//     if (isProxy(predicate)) {
//       update(this.objectTag, tagForProperty(predicate, 'isTruthy'));
//       return Boolean(get(predicate, 'isTruthy'));
//     } else {
//       update(this.objectTag, tagFor(predicate));
//       return emberToBool(predicate);
//     }
//   }
// }

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

  compute(): unknown {
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
    let combinedTrackingTag = track(() => {
      if (DEBUG) {
        deprecateMutationsInAutotrackingTransaction!(() => {
          computedValue = helper(positionalValue, namedValue);
        });
      } else {
        computedValue = helper(positionalValue, namedValue);
      }
    }, DEBUG && debugRenderMessage!(`(result of a \`${getDebugName!(helper)}\` helper)`));

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

  compute(): unknown {
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
    let combinedTrackingTag = track(() => {
      if (DEBUG) {
        deprecateMutationsInAutotrackingTransaction!(() => {
          computedValue = instance.compute(positionalValue, namedValue);
        });
      } else {
        computedValue = instance.compute(positionalValue, namedValue);
      }
    }, DEBUG && debugRenderMessage!(`(result of a \`${getDebugName!(instance)}\` helper)`));

    update(computeTag, combinedTrackingTag);

    return computedValue;
  }
}

export class InternalHelperReference extends CachedReference {
  public tag: Tag;

  constructor(
    private helper: (args: CapturedArguments) => unknown,
    private args: CapturedArguments
  ) {
    super();
    this.tag = args.tag;
  }

  compute(): unknown {
    let { helper, args } = this;
    return helper(args);
  }
}

export class UnboundReference<T extends object> extends ConstReference<T> {
  static create<T>(value: T): VersionedPathReference<T> {
    return valueToRef(value, false);
  }

  get(key: string): VersionedPathReference<unknown> {
    return valueToRef(this.inner[key], false);
  }
}

export class ReadonlyReference extends CachedReference {
  public tag: Tag;

  constructor(private inner: VersionedPathReference<unknown>) {
    super();
    this.tag = inner.tag;
  }

  get [INVOKE](): Function | undefined {
    return this.inner[INVOKE];
  }

  compute(): unknown {
    return this.inner.value();
  }

  get(key: string): VersionedPathReference {
    return this.inner.get(key);
  }
}

export function referenceFromParts(
  root: VersionedPathReference<unknown>,
  parts: string[]
): VersionedPathReference<unknown> {
  let reference = root;

  for (let i = 0; i < parts.length; i++) {
    reference = reference.get(parts[i]);
  }

  return reference;
}

function isObject(value: unknown): value is object {
  return value !== null && typeof value === 'object';
}

function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

function ensurePrimitive(value: unknown) {
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
}

function valueToRef<T = unknown>(
  value: T,
  bound = true,
  env?: Environment
): VersionedPathReference<T> {
  if (isObject(value)) {
    // root of interop with ember objects
    return bound ? new RootReference(value, env) : new UnboundReference(value);
  } else if (isFunction(value)) {
    // ember doesn't do observing with functions
    return new UnboundReference(value);
  } else {
    ensurePrimitive(value);
    return PrimitiveReference.create(value as any);
  }
}

function valueKeyToRef(value: unknown, key: string): VersionedPathReference<unknown> {
  if (isObject(value)) {
    // root of interop with ember objects
    return new RootPropertyReference(value, key);
  } else if (isFunction(value)) {
    // ember doesn't do observing with functions
    return new UnboundReference(value[key]);
  } else {
    ensurePrimitive(value);
    return UNDEFINED_REFERENCE;
  }
}
