import {
  get,
  set,
  tagForObject,
  tagForProperty,
} from '@ember/-internals/metal';
import { getDebugName, isProxy, symbol, isObject } from '@ember/-internals/utils';
import { assert, debugFreeze } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { Environment, CapturedArguments, Dict, Option } from '@glimmer/interfaces';
import {
  ConstReference,
  VersionedPathReference,
  VersionedReference,
  RootReference,
  PropertyReference,
  HelperRootReference,
  InternalHelperFunction,
} from '@glimmer/reference';
import {
  ConditionalReference as GlimmerConditionalReference,
  PrimitiveReference,
  UNDEFINED_REFERENCE,
} from '@glimmer/runtime';
import {
  combine,
  consume,
  createTag,
  createUpdatableTag,
  deprecateMutationsInAutotrackingTransaction,
  dirty,
  DirtyableTag,
  isConst,
  Revision,
  Tag,
  track,
  UpdatableTag,
  update,
  validate,
  value,
  CONSTANT_TAG,
} from '@glimmer/validator';
import { HelperInstance, RECOMPUTE_TAG, HelperFunction, SimpleHelper, isSimpleHelper } from '../helper';
import debugRenderMessage from './debug-render-message';
import emberToBool from './to-bool';

export const UPDATE = symbol('UPDATE');
export const INVOKE = symbol('INVOKE');
export const ACTION = symbol('ACTION');

// abstract class EmberPathReference implements VersionedPathReference<unknown> {
//   abstract tag: Tag;

//   get(key: string): VersionedPathReference<unknown> {
//     return PropertyReference.create(this, key);
//   }

//   abstract value(): unknown;
// }

// export abstract class CachedReference extends EmberPathReference {
//   abstract tag: Tag;
//   private lastRevision: Option<Revision>;
//   private lastValue: unknown;

//   constructor() {
//     super();
//     this.lastRevision = null;
//     this.lastValue = null;
//   }

//   abstract compute(): unknown;

//   value(): unknown {
//     let { tag, lastRevision, lastValue } = this;

//     if (lastRevision === null || !validate(tag, lastRevision)) {
//       lastValue = this.lastValue = this.compute();
//       this.lastRevision = value(tag);
//     }

//     return lastValue;
//   }
// }

// export class RootReference<T extends object> extends ConstReference<T>
//   implements VersionedPathReference<T> {
//   static create<T>(value: T, env?: Environment): VersionedPathReference<T> {
//     return valueToRef(value, true, env);
//   }

//   private children: Dict<VersionedPathReference<unknown>>;

//   constructor(value: T, private env?: Environment) {
//     super(value);
//     this.children = Object.create(null);
//   }

//   get(propertyKey: string): VersionedPathReference<unknown> {
//     let ref = this.children[propertyKey];

//     if (ref === undefined) {
//       ref = this.children[propertyKey] = new RootPropertyReference(
//         this.inner,
//         propertyKey,
//         this.env
//       );
//     }

//     return ref;
//   }
// }

// export abstract class PropertyReference extends CachedReference {
//   abstract tag: Tag;

//   static create(parentReference: VersionedPathReference<unknown>, propertyKey: string) {
//     if (isConst(parentReference)) {
//       return valueKeyToRef(parentReference.value(), propertyKey);
//     } else {
//       return new NestedPropertyReference(parentReference, propertyKey);
//     }
//   }

//   get(key: string): VersionedPathReference<unknown> {
//     return new NestedPropertyReference(this, key);
//   }
// }

// export class RootPropertyReference extends PropertyReference
//   implements VersionedPathReference<unknown> {
//   public tag: Tag;
//   private propertyTag: UpdatableTag;
//   private debugStackLog?: string;

//   constructor(private parentValue: object, private propertyKey: string, env?: Environment) {
//     super();

//     if (DEBUG) {
//       // Capture the stack when this reference is created, as that is the
//       // component/context that the component was created _in_. Later, it could
//       // be accessed from any number of components.
//       this.debugStackLog = env ? env.extra.debugRenderTree.logCurrentRenderStack() : '';
//     }

//     this.propertyTag = createUpdatableTag();

//     this.tag = this.propertyTag;
//   }

//   compute(): unknown {
//     let { parentValue, propertyKey } = this;

//     let ret;

//     let tag = track(
//       () => (ret = get(parentValue, propertyKey)),
//       DEBUG && debugRenderMessage!(this['debug']())
//     );

//     consume(tag);
//     update(this.propertyTag, tag);

//     return ret;
//   }

//   [UPDATE](value: unknown): void {
//     set(this.parentValue, this.propertyKey, value);
//   }
// }

// if (DEBUG) {
//   RootPropertyReference.prototype['debug'] = function debug(subPath?: string): string {
//     let path = `this.${this['propertyKey']}`;

//     if (subPath) {
//       path += `.${subPath}`;
//     }

//     return `${this['debugStackLog']}${path}`;
//   };
// }

// export class NestedPropertyReference extends PropertyReference {
//   public tag: Tag;
//   private propertyTag: UpdatableTag;

//   constructor(
//     private parentReference: VersionedPathReference<unknown>,
//     private propertyKey: string
//   ) {
//     super();
//     debugger

//     let parentReferenceTag = parentReference.tag;
//     let propertyTag = (this.propertyTag = createUpdatableTag());

//     this.tag = combine([parentReferenceTag, propertyTag]);
//   }

//   compute(): unknown {
//     let { parentReference, propertyTag, propertyKey } = this;

//     let _parentValue = parentReference.value();
//     let parentValueType = typeof _parentValue;

//     if (parentValueType === 'string' && propertyKey === 'length') {
//       return (_parentValue as string).length;
//     }

//     if ((parentValueType === 'object' && _parentValue !== null) || parentValueType === 'function') {
//       let parentValue = _parentValue as object;

//       let ret;

//       let tag = track(
//         () => (ret = get(parentValue, propertyKey)),
//         DEBUG && debugRenderMessage!(this['debug']())
//       );

//       consume(tag);

//       update(propertyTag, tag);

//       return ret;
//     } else {
//       return undefined;
//     }
//   }

//   [UPDATE](value: unknown): void {
//     set(
//       this.parentReference.value() as object /* let the other side handle the error */,
//       this.propertyKey,
//       value
//     );
//   }
// }

// if (DEBUG) {
//   NestedPropertyReference.prototype['debug'] = function debug(subPath?: string): string {
//     let parent = this['parentReference'];
//     let path = subPath ? `${this['propertyKey']}.${subPath}` : this['propertyKey'];

//     if (typeof parent['debug'] === 'function') {
//       return parent['debug'](path);
//     } else {
//       return `unknownObject.${path}`;
//     }
//   };
// }

// export class UpdatableReference extends EmberPathReference {
//   public tag: DirtyableTag;
//   private _value: unknown;

//   constructor(value: unknown) {
//     super();

//     this.tag = createTag();
//     this._value = value;
//   }

//   value(): unknown {
//     return this._value;
//   }

//   update(value: unknown): void {
//     let { _value } = this;

//     if (value !== _value) {
//       dirty(this.tag);
//       this._value = value;
//     }
//   }
// }

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

// abstract class HelperReference<T> extends RootReference<unknown> {
//   abstract tag: Tag;
//   private lastRevision: Option<Revision>;
//   private lastValue: unknown;

//   constructor(protected inner: T, env: Environment) {
//     super(inner, env);
//     this.lastRevision = null;
//     this.lastValue = null;
//   }

//   abstract compute(): unknown;

//   value(): unknown {
//     let { tag, lastRevision, lastValue } = this;

//     if (lastRevision === null || !validate(tag, lastRevision)) {
//       lastValue = this.lastValue = this.compute();
//       this.lastRevision = value(tag);
//     }

//     return lastValue;
//   }
// }

// export class SimpleHelperReference extends HelperReference<HelperFunction> {
//   static create(helper: HelperFunction, args: CapturedArguments) {
//     if (isConst(args)) {
      // let { positional, named } = args;

      // let positionalValue = positional.value();
      // let namedValue = named.value();

      // if (DEBUG) {
      //   debugFreeze(positionalValue);
      //   debugFreeze(namedValue);
      // }

//       let result = helper(positionalValue, namedValue);
//       return valueToRef(result);
//     } else {
//       return new SimpleHelperReference(helper, args);
//     }
//   }

//   private computeTag: UpdatableTag;
//   public tag: Tag;

//   constructor(inner: HelperFunction, env: Environment, private args: CapturedArguments) {
//     super(inner, env);

//     let computeTag = (this.computeTag = createUpdatableTag());
//     this.tag = combine([args.tag, computeTag]);
//   }

//   compute(): unknown {
//     let {
//       inner,
//       computeTag,
//       args: { positional, named },
//     } = this;

//     let positionalValue = positional.value();
//     let namedValue = named.value();

//     if (DEBUG) {
//       debugFreeze(positionalValue);
//       debugFreeze(namedValue);
//     }

//     let computedValue;
//     let combinedTrackingTag = track(() => {
//       if (DEBUG) {
//         deprecateMutationsInAutotrackingTransaction!(() => {
//           computedValue = inner(positionalValue, namedValue);
//         });
//       } else {
//         computedValue = inner(positionalValue, namedValue);
//       }
//     }, DEBUG && debugRenderMessage!(`(result of a \`${getDebugName!(inner)}\` helper)`));

//     update(computeTag, combinedTrackingTag);

//     return computedValue;
//   }
// }

// export class ClassBasedHelperReference extends HelperReference<HelperInstance> {
//   // static create(instance: HelperInstance, args: CapturedArguments) {
//   //   return new ClassBasedHelperReference(instance, args);
//   // }

//   private computeTag: UpdatableTag;
//   public tag: Tag;

//   constructor(inner: HelperInstance, env: Environment, private args: CapturedArguments) {
//     super(inner, env);

//     let computeTag = (this.computeTag = createUpdatableTag());
//     this.tag = combine([inner[RECOMPUTE_TAG], args.tag, computeTag]);
//   }

//   compute(): unknown {
//     let {
//       inner,
//       computeTag,
//       args: { positional, named },
//     } = this;

//     let positionalValue = positional.value();
//     let namedValue = named.value();

//     if (DEBUG) {
//       debugFreeze(positionalValue);
//       debugFreeze(namedValue);
//     }

//     let computedValue;
//     let combinedTrackingTag = track(() => {
//       if (DEBUG) {
//         deprecateMutationsInAutotrackingTransaction!(() => {
//           computedValue = inner.compute(positionalValue, namedValue);
//         });
//       } else {
//         computedValue = inner.compute(positionalValue, namedValue);
//       }
//     }, DEBUG && debugRenderMessage!(`(result of a \`${getDebugName!(inner)}\` helper)`));

//     update(computeTag, combinedTrackingTag);

//     return computedValue;
//   }
// }

// export class InternalHelperReference extends HelperReference<(args: CapturedArguments) => unknown> {
//   public tag: Tag;

//   constructor(
//     inner: (args: CapturedArguments) => unknown,
//     env: Environment,
//     private args: CapturedArguments
//   ) {
//     super(inner, env);
//     this.tag = args.tag;
//   }

//   compute(): unknown {
//     let { inner, args } = this;
//     return inner(args);
//   }
// }

// export let EmberHelperRootReference: { new(fn: HelperFunction, args: CapturedArguments, env: Environment, debugName?: string | false): HelperRootReference; };

// if (DEBUG) {
  // EmberHelperRootReference = class <T = unknown> extends HelperRootReference<T> {
  //   private debugName: string;

  //   constructor(fn: HelperFunction, args: CapturedArguments, env: Environment, debugName?: string | false) {
  //     let fnWrapper = (args: CapturedArguments) => {
  //       let ret: T | undefined;

  //       deprecateMutationsInAutotrackingTransaction!(() => {
  //         ret = fn(args) as T;
  //       });

  //       return ret!;
  //     };

  //     super(fnWrapper, args, env);

  //     this.debugName = debugName || fn.name || 'unknown';
  //   }

  //   getDebugPath() {
  //     return `(result of a \`(${this.debugName})\` helper)`;
  //   }
  // }
// } else {
//   EmberHelperRootReference = HelperRootReference;
// }

export class EmberHelperRootReference<T = unknown> extends HelperRootReference<T> {
  constructor(helper: SimpleHelper<T> | HelperInstance<T>, args: CapturedArguments, env: Environment) {
    let fnWrapper = (args: CapturedArguments) => {
      let { positional, named } = args;

      let positionalValue = positional.value();
      let namedValue = named.value();

      let ret: T;

      if (DEBUG) {
        debugFreeze(positionalValue);
        debugFreeze(namedValue);

        deprecateMutationsInAutotrackingTransaction!(() => {
          ret = helper.compute(positionalValue, namedValue);
        });
      } else {
        ret = helper.compute(positionalValue, namedValue);
      }

      return ret!;
    }


    if (DEBUG) {
      let debugName = isSimpleHelper(helper) ? getDebugName!(helper.compute) : getDebugName!(helper);

      super(fnWrapper, args, env, debugName);
    } else {
      super(fnWrapper, args, env);
    }
  }
}

export class ReadonlyReference extends RootReference {
  public tag: Tag;

  constructor(protected inner: VersionedPathReference, env: Environment) {
    super(env);
    this.tag = inner.tag;
  }

  value(): unknown {
    return this.inner.value();
  }

  get(key: string): VersionedPathReference {
    return this.inner.get(key);
  }
}

export class UnboundRootReference<T = unknown> extends RootReference<T> {
  constructor(private inner: T, protected env: Environment, parent?: VersionedPathReference, key?: string) {
    super(env);

    if (DEBUG) {
      env.setTemplatePathDebugContext(this, key || 'this', parent || null);
    }
  }

  value() {
    return this.inner;
  }

  get(key: string): VersionedPathReference<unknown> {
    let value = this.value();

    if (isObject(value)) {
      // root of interop with ember objects
      return new UnboundPropertyReference(value[key], this.env, this, key);
    } else {
      return PrimitiveReference.create(value as any);
    }
  }
}

export class UnboundPropertyReference extends UnboundRootReference {}

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

// function isObject(value: unknown): value is object {
//   return value !== null && typeof value === 'object';
// }

// function isFunction(value: unknown): value is Function {
//   return typeof value === 'function';
// }

// function ensurePrimitive(value: unknown) {
//   if (DEBUG) {
//     let label;

//     try {
//       label = ` (was \`${String(value)}\`)`;
//     } catch (e) {
//       label = null;
//     }

//     assert(
//       `This is a fall-through check for typing purposes only! \`value\` must already be a primitive at this point.${label})`,
//       value === undefined ||
//         value === null ||
//         typeof value === 'boolean' ||
//         typeof value === 'number' ||
//         typeof value === 'string'
//     );
//   }
// }

// function valueToRef<T = unknown>(
//   value: T,
//   bound = true,
//   env?: Environment
// ): VersionedPathReference<T> {
//   if (isObject(value)) {
//     // root of interop with ember objects
//     return bound ? new RootReference(env, value) : new UnboundReference(value);
//   } else if (isFunction(value)) {
//     // ember doesn't do observing with functions
//     return new UnboundReference(value);
//   } else {
//     ensurePrimitive(value);
//     return PrimitiveReference.create(value as any);
//   }
// }

// function valueKeyToRef(value: unknown, key: string): VersionedPathReference<unknown> {
//   if (isObject(value)) {
//     // root of interop with ember objects
//     return new RootPropertyReference(value, key);
//   } else if (isFunction(value)) {
//     // ember doesn't do observing with functions
//     return new UnboundReference(value[key]);
//   } else {
//     ensurePrimitive(value);
//     return UNDEFINED_REFERENCE;
//   }
// }
