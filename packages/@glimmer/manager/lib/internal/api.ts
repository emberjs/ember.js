import { DEBUG } from '@glimmer/env';
import type {
  CapturedArguments,
  Helper,
  HelperDefinitionState,
  InternalComponentManager,
  InternalModifierManager,
  Owner,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import debugToString from '@glimmer/debug-util/lib/debug-to-string';
import { debugAssert } from '@glimmer/global-context';
import { createComputeRef, parentRefFor, valueForRef } from '@glimmer/reference/lib/reference';

import { argsProxyFor } from '../util/args-proxy';
import { CustomHelperManager } from '../public/helper';
import { FunctionHelperManager, invokeFunctionHelper } from './defaults';

type InternalManager =
  | InternalComponentManager
  | InternalModifierManager
  | CustomHelperManager
  | Helper;

const COMPONENT_MANAGERS = new WeakMap<object, InternalComponentManager>();

const MODIFIER_MANAGERS = new WeakMap<object, InternalModifierManager>();

const HELPER_MANAGERS = new WeakMap<object, CustomHelperManager | Helper>();

///////////

/**
 * There is also Reflect.getPrototypeOf,
 * which errors when non-objects are passed.
 *
 * Since our conditional for figuring out whether to render primitives or not
 * may contain non-object values, we don't want to throw errors when we call this.
 */
const getPrototypeOf = Object.getPrototypeOf;

function setManager<Def extends object>(
  map: WeakMap<object, object>,
  manager: object,
  obj: Def
): Def {
  if (DEBUG) {
    debugAssert(
      obj !== null && (typeof obj === 'object' || typeof obj === 'function'),
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      `Attempted to set a manager on a non-object value. Managers can only be associated with objects or functions. Value was ${debugToString!(
        obj
      )}`
    );

    debugAssert(
      !map.has(obj), // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      `Attempted to set the same type of manager multiple times on a value. You can only associate one manager of each type with a given value. Value was ${debugToString!(
        obj
      )}`
    );
  }

  map.set(obj, manager);
  return obj;
}

function getManager<M extends InternalManager>(
  map: WeakMap<object, M>,
  obj: object
): M | undefined {
  let pointer: object | null = obj;
  while (pointer !== null) {
    const manager = map.get(pointer);

    if (manager !== undefined) {
      return manager;
    }

    pointer = getPrototypeOf(pointer) as object | null;
  }

  return undefined;
}

///////////

export function setInternalModifierManager<T extends object>(
  manager: InternalModifierManager,
  definition: T
): T {
  return setManager(MODIFIER_MANAGERS, manager, definition);
}

export function getInternalModifierManager(definition: object): InternalModifierManager;
export function getInternalModifierManager(
  definition: object,
  isOptional: true | undefined
): InternalModifierManager | null;
export function getInternalModifierManager(
  definition: object,
  isOptional?: true
): InternalModifierManager | null {
  if (DEBUG) {
    debugAssert(
      (typeof definition === 'object' && definition !== null) || typeof definition === 'function',
      () =>
        // eslint-disable-next-line @typescript-eslint/no-base-to-string -- @fixme
        `Attempted to use a value as a modifier, but it was not an object or function. Modifier definitions must be objects or functions with an associated modifier manager. The value was: ${definition}`
    );
  }

  const manager = getManager(MODIFIER_MANAGERS, definition);

  if (manager === undefined) {
    if (DEBUG) {
      debugAssert(
        isOptional,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        `Attempted to load a modifier, but there wasn't a modifier manager associated with the definition. The definition was: ${debugToString!(
          definition
        )}`
      );
    }

    return null;
  }

  return manager;
}

export function setInternalHelperManager<T extends object, O extends Owner>(
  manager: CustomHelperManager<O> | Helper<O>,
  definition: T
): T {
  return setManager(HELPER_MANAGERS, manager, definition);
}

const DEFAULT_MANAGER = new CustomHelperManager(() => new FunctionHelperManager());

export function getInternalHelperManager(definition: object): CustomHelperManager | Helper;
export function getInternalHelperManager(
  definition: object,
  isOptional: true | undefined
): CustomHelperManager | Helper | null;
export function getInternalHelperManager(
  definition: object,
  isOptional?: true
): CustomHelperManager | Helper | null {
  debugAssert(
    (typeof definition === 'object' && definition !== null) || typeof definition === 'function',
    () =>
      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- @fixme
      `Attempted to use a value as a helper, but it was not an object or function. Helper definitions must be objects or functions with an associated helper manager. The value was: ${definition}`
  );

  let manager = getManager(HELPER_MANAGERS, definition);

  // Functions are special-cased because functions are defined
  // as the "default" helper, per: https://github.com/emberjs/rfcs/pull/756
  if (manager === undefined && typeof definition === 'function') {
    manager = DEFAULT_MANAGER;
  }

  if (manager) {
    return manager;
  } else if (isOptional === true) {
    return null;
  } else if (DEBUG) {
    throw new Error(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      `Attempted to load a helper, but there wasn't a helper manager associated with the definition. The definition was: ${debugToString!(
        definition
      )}`
    );
  }

  return null;
}

export function setInternalComponentManager<T extends object>(
  factory: InternalComponentManager,
  obj: T
): T {
  return setManager(COMPONENT_MANAGERS, factory, obj);
}

export function getInternalComponentManager(definition: object): InternalComponentManager;
export function getInternalComponentManager(
  definition: object,
  isOptional: true | undefined
): InternalComponentManager | null;
export function getInternalComponentManager(
  definition: object,
  isOptional?: true
): InternalComponentManager | null {
  debugAssert(
    (typeof definition === 'object' && definition !== null) || typeof definition === 'function',
    () =>
      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- @fixme
      `Attempted to use a value as a component, but it was not an object or function. Component definitions must be objects or functions with an associated component manager. The value was: ${definition}`
  );

  const manager = getManager(COMPONENT_MANAGERS, definition);

  if (manager === undefined) {
    debugAssert(
      isOptional,
      () =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        `Attempted to load a component, but there wasn't a component manager associated with the definition. The definition was: ${debugToString!(
          definition
        )}`
    );

    return null;
  }

  return manager;
}

///////////

export function hasInternalComponentManager(definition: object): boolean {
  return (
    hasDefaultComponentManager(definition) ||
    getManager(COMPONENT_MANAGERS, definition) !== undefined
  );
}

export function hasInternalHelperManager(definition: object): boolean {
  return (
    hasDefaultHelperManager(definition) || getManager(HELPER_MANAGERS, definition) !== undefined
  );
}

export function hasInternalModifierManager(definition: object): boolean {
  return (
    hasDefaultModifierManager(definition) || getManager(MODIFIER_MANAGERS, definition) !== undefined
  );
}

/**
 * Whether a value has a helper manager explicitly associated with it, as
 * opposed to a plain function (which falls back to the default function helper
 * manager). Used to decide whether a function invoked from a path expression
 * may be safely re-bound to the object it was read from.
 */
export function hasCustomHelperManager(definition: object): boolean {
  return getManager(HELPER_MANAGERS, definition) !== undefined;
}

/**
 * When a plain function is invoked from a path expression (`{{(this.obj.method)}}`,
 * `{{item.greet}}`), it should be called with the object it was read from as `this`,
 * matching the JavaScript semantics of `obj.method()`. Returns a reference that
 * invokes the function with that `this`, or `null` when no such binding applies (in
 * which case the value should be resolved as an ordinary helper).
 *
 * The `this` is applied at the call itself (see `invokeFunctionHelper`), never by
 * producing a `.bind()`ed copy, because functions are passed around as references
 * constantly (e.g. to the `{{on}}` modifier or the `(fn)` helper) and we must not
 * change a function's identity before it is invoked. Functions with an explicitly-
 * associated helper manager are left to the normal helper path.
 *
 * The parent's value is read eagerly here; this runs inside the dynamic-helper
 * compute, so replacing the base object re-runs it and rebinds `this` on the next
 * revision.
 */
export function functionHelperRefForPath(
  definition: HelperDefinitionState,
  ref: Reference,
  capturedArgs: CapturedArguments
): Reference | null {
  if (typeof definition !== 'function' || hasCustomHelperManager(definition)) {
    return null;
  }

  let parentRef = parentRefFor(ref);

  if (parentRef === null) {
    return null;
  }

  let self = valueForRef(parentRef);

  if (!((typeof self === 'object' && self !== null) || typeof self === 'function')) {
    return null;
  }

  let args = argsProxyFor(capturedArgs, 'helper');

  return createComputeRef(() =>
    invokeFunctionHelper(definition as (this: unknown, ...args: unknown[]) => unknown, args, self)
  );
}

function hasDefaultComponentManager(_definition: object): boolean {
  return false;
}

function hasDefaultHelperManager(definition: object): boolean {
  return typeof definition === 'function';
}

function hasDefaultModifierManager(_definition: object): boolean {
  return false;
}
