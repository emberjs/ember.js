import { Owner } from '@glimmer/interfaces';
import { DEBUG } from '@glimmer/env';
import { debugToString, _WeakSet } from '@glimmer/util';
import {
  InternalComponentManager,
  InternalModifierManager,
  HelperManager,
  Helper,
} from '@glimmer/interfaces';

type InternalManager =
  | InternalComponentManager
  | InternalModifierManager
  | HelperManager<unknown>
  | Helper;

const COMPONENT_MANAGERS = new WeakMap<
  object,
  InternalManagerFactory<Owner, InternalComponentManager>
>();

const MODIFIER_MANAGERS = new WeakMap<
  object,
  InternalManagerFactory<Owner, InternalModifierManager>
>();

const HELPER_MANAGERS = new WeakMap<
  object,
  InternalManagerFactory<Owner | undefined, HelperManager<unknown> | Helper>
>();

const OWNER_MANAGER_INSTANCES: WeakMap<
  Owner,
  WeakMap<InternalManagerFactory<Owner>, unknown>
> = new WeakMap();
const UNDEFINED_MANAGER_INSTANCES: WeakMap<InternalManagerFactory<Owner>, unknown> = new WeakMap();

export type InternalManagerFactory<O, D extends InternalManager = InternalManager> = (
  owner: O
) => D;

///////////

const getPrototypeOf = Object.getPrototypeOf;

function setManager<O extends Owner, Def extends object>(
  map: WeakMap<Def, InternalManagerFactory<O>>,
  factory: InternalManagerFactory<O> | InternalManagerFactory<O | undefined>,
  obj: Def
): Def {
  if (DEBUG && (typeof obj !== 'object' || obj === null) && typeof obj !== 'function') {
    throw new Error(
      `Attempted to set a manager on a non-object value. Managers can only be associated with objects or functions. Value was ${debugToString!(
        obj
      )}`
    );
  }

  if (DEBUG && map.has(obj)) {
    throw new Error(
      `Attempted to set the same type of manager multiple times on a value. You can only associate one manager of each type with a given value. Value was ${debugToString!(
        obj
      )}`
    );
  }

  map.set(obj, factory);
  return obj;
}

function getManager<O, D extends InternalManager>(
  map: WeakMap<object, InternalManagerFactory<O, D>>,
  obj: object
): InternalManagerFactory<O, D> | undefined {
  let pointer = obj;
  while (pointer !== undefined && pointer !== null) {
    const manager = map.get(pointer);

    if (manager !== undefined) {
      return manager;
    }

    pointer = getPrototypeOf(pointer);
  }

  return undefined;
}

function getManagerInstanceForOwner<D extends InternalManager>(
  owner: Owner | undefined,
  factory: InternalManagerFactory<Owner, D>
): D {
  let managers;

  if (owner === undefined) {
    managers = UNDEFINED_MANAGER_INSTANCES;
  } else {
    managers = OWNER_MANAGER_INSTANCES.get(owner);

    if (managers === undefined) {
      managers = new WeakMap();
      OWNER_MANAGER_INSTANCES.set(owner, managers);
    }
  }

  let instance = managers.get(factory);

  if (instance === undefined) {
    instance = factory(owner!);
    managers.set(factory, instance!);
  }

  // We know for sure that it's the correct type at this point, but TS can't know
  return instance as D;
}

///////////

export function setInternalModifierManager<O extends Owner>(
  factory: InternalManagerFactory<O, InternalModifierManager>,
  definition: object
) {
  return setManager(MODIFIER_MANAGERS, factory, definition);
}

export function getInternalModifierManager(
  owner: Owner | undefined,
  definition: object
): InternalModifierManager {
  const factory = getManager(MODIFIER_MANAGERS, definition)!;

  if (DEBUG && factory === undefined) {
    throw new Error(
      `Attempted to load a modifier, but there wasn't a manager associated with the definition. The definition was: ${debugToString!(
        definition
      )}`
    );
  }

  return getManagerInstanceForOwner(owner, factory);
}

export function setInternalHelperManager<O extends Owner>(
  factory: InternalManagerFactory<O | undefined, HelperManager<unknown> | Helper>,
  definition: object
) {
  return setManager(HELPER_MANAGERS, factory, definition);
}

export function getInternalHelperManager(
  owner: Owner | undefined,
  definition: object
): HelperManager<unknown> | Helper {
  const factory = getManager(HELPER_MANAGERS, definition)!;

  if (DEBUG && factory === undefined) {
    throw new Error(
      `Attempted to load a helper, but there wasn't a manager associated with the definition. The definition was: ${debugToString!(
        definition
      )}`
    );
  }

  return getManagerInstanceForOwner(owner, factory);
}

export function setInternalComponentManager<O extends Owner>(
  factory: InternalManagerFactory<O, InternalComponentManager>,
  obj: object
) {
  return setManager(COMPONENT_MANAGERS, factory, obj);
}

export function getInternalComponentManager(
  owner: Owner | undefined,
  definition: object
): InternalComponentManager {
  const factory = getManager<Owner, InternalComponentManager>(COMPONENT_MANAGERS, definition)!;

  if (DEBUG && factory === undefined) {
    throw new Error(
      `Attempted to load a component, but there wasn't a manager associated with the definition. The definition was: ${debugToString!(
        definition
      )}`
    );
  }

  return getManagerInstanceForOwner(owner, factory);
}
