import type { Meta } from '@ember/-internals/meta/lib/meta';
import { meta as metaFor, peekMeta } from '@ember/-internals/meta/lib/meta';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import {
  type Decorator,
  identifyModernDecoratorArgs,
  isModernDecoratorArgs,
  onClassFinalized,
  type StandardGetterDecorator,
  type StandardMethodDecorator,
  type StandardSetterDecorator,
} from './decorator-util';

export type DecoratorPropertyDescriptor = (PropertyDescriptor & { initializer?: any }) | undefined;

// Same as built-in MethodDecorator but with more arguments
export type ExtendedMethodDecorator = (
  target: object,
  key: string,
  desc: DecoratorPropertyDescriptor,
  maybeMeta?: Meta,
  isClassicDecorator?: boolean
) => DecoratorPropertyDescriptor;

export type ElementDescriptor = [
  target: object,
  propertyName: string,
  descriptor?: DecoratorPropertyDescriptor,
];

export function isElementDescriptor(args: unknown[]): args is ElementDescriptor {
  let [maybeTarget, maybeKey, maybeDesc] = args;

  return (
    // Ensure we have the right number of args
    args.length === 3 &&
    // Make sure the target is a class or object (prototype)
    (typeof maybeTarget === 'function' ||
      (typeof maybeTarget === 'object' && maybeTarget !== null)) &&
    // Make sure the key is a string
    typeof maybeKey === 'string' &&
    // Make sure the descriptor is the right shape
    ((typeof maybeDesc === 'object' && maybeDesc !== null) || maybeDesc === undefined)
  );
}

export function isDecoratorCall(
  args: unknown[]
): args is ElementDescriptor | Parameters<Decorator> {
  return isElementDescriptor(args) || isModernDecoratorArgs(args);
}

export function nativeDescDecorator(
  propertyDesc: PropertyDescriptor
): ExtendedMethodDecorator &
  StandardGetterDecorator &
  StandardSetterDecorator &
  StandardMethodDecorator {
  let decorator = function (...args: unknown[]): DecoratorPropertyDescriptor {
    if (isModernDecoratorArgs(args)) {
      nativeDescDecorator2023(args, propertyDesc);
      return undefined;
    }
    return propertyDesc;
  };

  setClassicDecorator(decorator);

  // SAFETY: the implementation handles both legacy and standard decorator args.
  return decorator as unknown as ReturnType<typeof nativeDescDecorator>;
}

/**
  Objects of this type can implement an interface to respond to requests to
  get and set. The default implementation handles simple properties.

  @class Descriptor
  @private
*/
export abstract class ComputedDescriptor {
  enumerable = true;
  configurable = true;
  _dependentKeys?: string[] = undefined;
  _meta: any = undefined;

  setup(
    _obj: object,
    keyName: string,
    _propertyDesc: DecoratorPropertyDescriptor | undefined,
    meta: Meta
  ): void {
    meta.writeDescriptors(keyName, this);
  }

  teardown(_obj: object, keyName: string, meta: Meta): void {
    meta.removeDescriptors(keyName);
  }

  abstract get(obj: object, keyName: string): any | null | undefined;
  abstract set(obj: object, keyName: string, value: any | null | undefined): any | null | undefined;
}

let COMPUTED_GETTERS: WeakSet<() => unknown>;

if (DEBUG) {
  COMPUTED_GETTERS = new WeakSet();
}

function DESCRIPTOR_GETTER_FUNCTION(name: string, descriptor: ComputedDescriptor): () => unknown {
  function getter(this: object): unknown {
    return descriptor.get(this, name);
  }

  if (DEBUG) {
    COMPUTED_GETTERS.add(getter);
  }

  return getter;
}

function DESCRIPTOR_SETTER_FUNCTION(
  name: string,
  descriptor: ComputedDescriptor
): (value: any) => void {
  let set = function CPSETTER_FUNCTION(this: object, value: any): void {
    return descriptor.set(this, name, value);
  };

  COMPUTED_SETTERS.add(set);

  return set;
}

export const COMPUTED_SETTERS = new WeakSet();

export function makeComputedDecorator(
  desc: ComputedDescriptor,
  DecoratorClass: { prototype: object }
): ExtendedMethodDecorator {
  let decorator = function COMPUTED_DECORATOR(...args: unknown[]): DecoratorPropertyDescriptor {
    if (isModernDecoratorArgs(args)) {
      return computedDecorator2023(args, desc) as unknown as DecoratorPropertyDescriptor;
    }

    let [target, key, propertyDesc, maybeMeta, isClassicDecorator] = args as [
      object,
      string,
      DecoratorPropertyDescriptor | undefined,
      Meta | undefined,
      boolean | undefined,
    ];

    let meta = args.length < 4 ? metaFor(target) : maybeMeta;
    desc.setup(target, key, propertyDesc, meta!);

    return makeDescriptor(desc, key, propertyDesc, isClassicDecorator);
  };

  setClassicDecorator(decorator, desc);

  Object.setPrototypeOf(decorator, DecoratorClass.prototype);

  return decorator;
}

function makeDescriptor(
  desc: ComputedDescriptor,
  key: string,
  propertyDesc?: DecoratorPropertyDescriptor,
  isClassicDecorator?: boolean
): PropertyDescriptor {
  assert(
    `Only one computed property decorator can be applied to a class field or accessor, but '${key}' was decorated twice. You may have added the decorator to both a getter and setter, which is unnecessary.`,
    isClassicDecorator ||
      !propertyDesc ||
      !propertyDesc.get ||
      !COMPUTED_GETTERS.has(propertyDesc.get)
  );

  let computedDesc: PropertyDescriptor = {
    enumerable: desc.enumerable,
    configurable: desc.configurable,
    get: DESCRIPTOR_GETTER_FUNCTION(key, desc),
    set: DESCRIPTOR_SETTER_FUNCTION(key, desc),
  };
  return computedDesc;
}

function computedDecorator2023(args: Parameters<Decorator>, desc: ComputedDescriptor) {
  const dec = identifyModernDecoratorArgs(args);

  switch (dec.kind) {
    case 'field': {
      let key = dec.context.name as string;
      onClassFinalized(dec.context, (proto) => {
        desc.setup(proto, key, undefined, metaFor(proto));
        Object.defineProperty(proto, key, makeDescriptor(desc, key));
      });
      // The class field itself would otherwise shadow the prototype's accessor.
      dec.context.addInitializer(function (this: any) {
        Object.defineProperty(this, key, makeDescriptor(desc, key));
      });
      return undefined;
    }
    case 'setter':
    case 'getter': {
      let key = dec.context.name as string;
      onClassFinalized(dec.context, (proto) => {
        let propertyDesc = Object.getOwnPropertyDescriptor(proto, key);
        desc.setup(proto, key, propertyDesc, metaFor(proto));
        Object.defineProperty(proto, key, makeDescriptor(desc, key, propertyDesc));
      });
      return undefined;
    }
    case 'method':
      assert(
        `@computed can only be used on accessors or fields, attempted to use it with ${dec.context.name.toString()} but that was a method. Try converting it to a getter (e.g. \`get ${dec.context.name.toString()}() {}\`)`,
        false
      );
    // TS knows "assert()" is terminal and will complain about unreachable code if
    // I use a break here. ESLint complains if I *don't* use a break here.
    // eslint-disable-next-line no-fallthrough
    default:
      throw new Error(
        `unimplemented: computedDecorator on ${dec.kind} ${dec.context.name?.toString()}`
      );
  }
}

// Under legacy decorators, the descriptor returned by `nativeDescDecorator` gets
// passed to `Object.defineProperty` on the prototype, which merges it into the
// existing descriptor (e.g. keeping a getter while making it non-enumerable).
// Stage 3 decorators can't return descriptors, so we apply it ourselves.
function nativeDescDecorator2023(args: Parameters<Decorator>, propertyDesc: PropertyDescriptor) {
  const dec = identifyModernDecoratorArgs(args);
  assert(
    `nativeDescDecorator can only be used on methods and accessors, attempted to use it with ${dec.context.name?.toString()} which is a ${dec.kind}`,
    dec.kind === 'method' || dec.kind === 'getter' || dec.kind === 'setter'
  );
  onClassFinalized(dec.context, (proto) => {
    Object.defineProperty(proto, dec.context.name, propertyDesc);
  });
}

/////////////

const DECORATOR_DESCRIPTOR_MAP: WeakMap<ExtendedMethodDecorator, ComputedDescriptor | true> =
  new WeakMap();

/**
  Returns the CP descriptor associated with `obj` and `keyName`, if any.

  @method descriptorForProperty
  @param {Object} obj the object to check
  @param {String} keyName the key to check
  @return {Descriptor}
  @private
*/
export function descriptorForProperty(obj: object, keyName: string, _meta?: Meta | null) {
  assert('Cannot call `descriptorForProperty` on null', obj !== null);
  assert('Cannot call `descriptorForProperty` on undefined', obj !== undefined);
  assert(
    `Cannot call \`descriptorForProperty\` on ${typeof obj}`,
    typeof obj === 'object' || typeof obj === 'function'
  );

  let meta = _meta === undefined ? peekMeta(obj) : _meta;

  if (meta !== null) {
    return meta.peekDescriptors(keyName);
  }
}

export function descriptorForDecorator(dec: Function): ComputedDescriptor | true | undefined {
  return DECORATOR_DESCRIPTOR_MAP.get(dec as ExtendedMethodDecorator);
}

/**
  Check whether a value is a decorator

  @method isClassicDecorator
  @param {any} possibleDesc the value to check
  @return {boolean}
  @private
*/
export function isClassicDecorator(dec: unknown): dec is ExtendedMethodDecorator {
  return typeof dec === 'function' && DECORATOR_DESCRIPTOR_MAP.has(dec as ExtendedMethodDecorator);
}

/**
  Set a value as a decorator

  @method setClassicDecorator
  @param {function} decorator the value to mark as a decorator
  @private
*/
export function setClassicDecorator(
  dec: ExtendedMethodDecorator,
  value: ComputedDescriptor | true = true
) {
  DECORATOR_DESCRIPTOR_MAP.set(dec, value);
}
