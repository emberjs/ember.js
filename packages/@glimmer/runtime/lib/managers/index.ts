import { Capabilities, Owner } from '@glimmer/interfaces';
import { DEBUG } from '@glimmer/env';
import { debugToString, _WeakSet } from '@glimmer/util';
import {
  ComponentManager,
  InternalComponentManager,
  ModifierManager,
  InternalModifierManager,
  HelperManager,
  Helper,
} from '@glimmer/interfaces';
import {
  isInternalComponentManager,
  isInternalModifierManager,
  isInternalHelper,
} from './internal';

type ManagerDelegate =
  | ComponentManager<unknown>
  | InternalComponentManager
  | ModifierManager<unknown>
  | InternalModifierManager
  | HelperManager<unknown>
  | Helper;

const COMPONENT_MANAGERS = new WeakMap<
  object,
  ManagerFactory<Owner, ComponentManager<unknown> | InternalComponentManager>
>();

const FROM_CAPABILITIES = DEBUG ? new _WeakSet() : undefined;

const MODIFIER_MANAGERS = new WeakMap<
  object,
  ManagerFactory<Owner, ModifierManager<unknown> | InternalModifierManager>
>();

const HELPER_MANAGERS = new WeakMap<
  object,
  ManagerFactory<Owner | undefined, HelperManager<unknown> | Helper>
>();

const OWNER_MANAGER_INSTANCES: WeakMap<
  Owner,
  WeakMap<ManagerFactory<Owner>, unknown>
> = new WeakMap();
const UNDEFINED_MANAGER_INSTANCES: WeakMap<ManagerFactory<Owner>, unknown> = new WeakMap();

export type ManagerFactory<O, D extends ManagerDelegate = ManagerDelegate> = (owner: O) => D;

///////////

const getPrototypeOf = Object.getPrototypeOf;

function setManager<O extends Owner, Def extends object>(
  map: WeakMap<Def, ManagerFactory<O>>,
  factory: ManagerFactory<O> | ManagerFactory<O | undefined>,
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

function getManager<O, D extends ManagerDelegate>(
  map: WeakMap<object, ManagerFactory<O, D>>,
  obj: object
): ManagerFactory<O, D> | undefined {
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

function getManagerInstanceForOwner<D extends ManagerDelegate>(
  owner: Owner | undefined,
  factory: ManagerFactory<Owner, D>
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

export function setModifierManager<O extends Owner>(
  factory: ManagerFactory<O, ModifierManager<unknown> | InternalModifierManager>,
  definition: object
) {
  return setManager(MODIFIER_MANAGERS, factory, definition);
}

export function getModifierManager(
  owner: Owner | undefined,
  definition: object
): ModifierManager<unknown> | InternalModifierManager | undefined {
  const factory = getManager(MODIFIER_MANAGERS, definition);

  if (factory !== undefined) {
    let manager = getManagerInstanceForOwner(owner, factory);

    if (
      DEBUG &&
      !isInternalModifierManager(manager) &&
      !FROM_CAPABILITIES!.has(manager.capabilities)
    ) {
      // TODO: This error message should make sense in both Ember and Glimmer https://github.com/glimmerjs/glimmer-vm/issues/1200
      throw new Error(
        `Custom modifier managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.13' | '3.22')\` (imported via \`import { capabilities } from '@ember/modifier';\`). Received: \`${JSON.stringify(
          manager.capabilities
        )}\` for: \`${manager}\``
      );
    }

    return manager;
  }

  return undefined;
}

export function setHelperManager<O extends Owner>(
  factory: ManagerFactory<O | undefined, Helper | HelperManager<unknown>>,
  definition: object
) {
  return setManager(HELPER_MANAGERS, factory, definition);
}

export function getHelperManager(
  owner: Owner | undefined,
  definition: object
): HelperManager<unknown> | Helper | undefined {
  const factory = getManager(HELPER_MANAGERS, definition);

  if (factory !== undefined) {
    let manager = getManagerInstanceForOwner(owner, factory);

    if (DEBUG && !isInternalHelper(manager) && !FROM_CAPABILITIES!.has(manager.capabilities)) {
      // TODO: This error message should make sense in both Ember and Glimmer https://github.com/glimmerjs/glimmer-vm/issues/1200
      throw new Error(
        `Custom helper managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.23')\` (imported via \`import { capabilities } from '@ember/helper';\`). Received: \`${JSON.stringify(
          manager.capabilities
        )}\` for: \`${manager}\``
      );
    }

    return manager;
  }

  return undefined;
}

export function setComponentManager<O extends Owner>(
  factory: ManagerFactory<O, ComponentManager<unknown> | InternalComponentManager>,
  obj: object
) {
  return setManager(COMPONENT_MANAGERS, factory, obj);
}

export function getComponentManager(
  owner: Owner | undefined,
  definition: object
): ComponentManager<unknown> | InternalComponentManager | undefined {
  const factory = getManager<Owner, ComponentManager<unknown> | InternalComponentManager>(
    COMPONENT_MANAGERS,
    definition
  );

  if (factory !== undefined) {
    let manager = getManagerInstanceForOwner(owner, factory);

    if (
      DEBUG &&
      !isInternalComponentManager(manager) &&
      !FROM_CAPABILITIES!.has(manager.capabilities)
    ) {
      // TODO: This error message should make sense in both Ember and Glimmer https://github.com/glimmerjs/glimmer-vm/issues/1200
      throw new Error(
        `Custom component managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.4' | '3.13')\` (imported via \`import { capabilities } from '@ember/component';\`). Received: \`${JSON.stringify(
          (manager as ComponentManager<unknown>).capabilities
        )}\` for: \`${manager}\``
      );
    }

    return manager;
  }

  return undefined;
}

export function buildCapabilities<T extends object>(capabilities: T): T & Capabilities {
  if (DEBUG) {
    FROM_CAPABILITIES!.add(capabilities);
    Object.freeze(capabilities);
  }

  return capabilities as T & Capabilities;
}
