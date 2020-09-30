import { Owner } from '@ember/-internals/owner';
import { assert, deprecate } from '@ember/debug';
import { COMPONENT_MANAGER_STRING_LOOKUP } from '@ember/deprecated-features';
import { DEBUG } from '@glimmer/env';
import { _WeakSet } from '@glimmer/util';
import { ManagerDelegate as ComponentManagerDelegate } from '../component-managers/custom';
import InternalComponentManager, { isInternalManager } from '../component-managers/internal';
import { HelperManager } from '../helpers/custom';
import { ModifierManagerDelegate } from '../modifiers/custom';

type ManagerDelegate =
  | ComponentManagerDelegate<unknown>
  | InternalComponentManager
  | ModifierManagerDelegate<unknown>
  | HelperManager;

const COMPONENT_MANAGERS = new WeakMap<
  object,
  ManagerFactory<ComponentManagerDelegate<unknown> | InternalComponentManager>
>();

const FROM_CAPABILITIES = DEBUG ? new _WeakSet() : undefined;

const MODIFIER_MANAGERS = new WeakMap<object, ManagerFactory<ModifierManagerDelegate<unknown>>>();

const HELPER_MANAGERS = new WeakMap<object, ManagerFactory<HelperManager<unknown>>>();

const MANAGER_INSTANCES: WeakMap<Owner, WeakMap<ManagerFactory, unknown>> = new WeakMap();

export type ManagerFactory<D extends ManagerDelegate = ManagerDelegate> = (owner: Owner) => D;

///////////

const getPrototypeOf = Object.getPrototypeOf;

function setManager<Def extends object>(
  map: WeakMap<object, ManagerFactory>,
  factory: ManagerFactory,
  obj: Def
): Def {
  map.set(obj, factory);
  return obj;
}

function getManager<D extends ManagerDelegate>(
  map: WeakMap<object, ManagerFactory<D>>,
  obj: object
): ManagerFactory<D> | undefined {
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
  owner: Owner,
  factory: ManagerFactory<D>
): D {
  let managers = MANAGER_INSTANCES.get(owner);

  if (managers === undefined) {
    managers = new WeakMap();
    MANAGER_INSTANCES.set(owner, managers);
  }

  let instance = managers.get(factory);

  if (instance === undefined) {
    instance = factory(owner);

    managers.set(factory, instance!);
  }

  // We know for sure that it's the correct type at this point, but TS can't know
  return instance as D;
}

///////////

export function setModifierManager(
  factory: ManagerFactory<ModifierManagerDelegate<unknown>>,
  definition: object
) {
  return setManager(MODIFIER_MANAGERS, factory, definition);
}

export function getModifierManager(
  owner: Owner,
  definition: object
): ModifierManagerDelegate<unknown> | undefined {
  const factory = getManager(MODIFIER_MANAGERS, definition);

  if (factory !== undefined) {
    let manager = getManagerInstanceForOwner(owner, factory);
    assert(
      `Custom modifier managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.13' | '3.22')\` (imported via \`import { capabilities } from '@ember/modifier';\`). Received: \`${JSON.stringify(
        manager.capabilities
      )}\` for: \`${manager}\``,
      FROM_CAPABILITIES!.has(manager.capabilities)
    );

    return manager;
  }

  return undefined;
}

export function setHelperManager(
  factory: ManagerFactory<HelperManager<unknown>>,
  definition: object
) {
  return setManager(HELPER_MANAGERS, factory, definition);
}

export function getHelperManager(
  owner: Owner,
  definition: object
): HelperManager<unknown> | undefined {
  const factory = getManager(HELPER_MANAGERS, definition);

  if (factory !== undefined) {
    let manager = getManagerInstanceForOwner(owner, factory);

    assert(
      `Custom helper managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.23')\` (imported via \`import { capabilities } from '@ember/helper';\`). Received: \`${JSON.stringify(
        manager.capabilities
      )}\` for: \`${manager}\``,
      FROM_CAPABILITIES!.has(manager.capabilities)
    );

    return manager;
  }

  return undefined;
}

export function setComponentManager(
  stringOrFunction:
    | string
    | ManagerFactory<ComponentManagerDelegate<unknown> | InternalComponentManager>,
  obj: object
) {
  let factory: ManagerFactory<ComponentManagerDelegate<unknown> | InternalComponentManager>;
  if (COMPONENT_MANAGER_STRING_LOOKUP && typeof stringOrFunction === 'string') {
    deprecate(
      'Passing the name of the component manager to "setupComponentManager" is deprecated. Please pass a function that produces an instance of the manager.',
      false,
      {
        id: 'deprecate-string-based-component-manager',
        until: '4.0.0',
        url: 'https://emberjs.com/deprecations/v3.x/#toc_component-manager-string-lookup',
      }
    );
    factory = function (owner: Owner) {
      return owner.lookup<ComponentManagerDelegate<unknown> | InternalComponentManager>(
        `component-manager:${stringOrFunction}`
      )!;
    };
  } else {
    factory = stringOrFunction as ManagerFactory<
      ComponentManagerDelegate<unknown> | InternalComponentManager
    >;
  }

  return setManager(COMPONENT_MANAGERS, factory, obj);
}

export function getComponentManager(
  owner: Owner,
  definition: object
): ComponentManagerDelegate<unknown> | InternalComponentManager | undefined {
  const factory = getManager<ComponentManagerDelegate<unknown> | InternalComponentManager>(
    COMPONENT_MANAGERS,
    definition
  );

  if (factory !== undefined) {
    let manager = getManagerInstanceForOwner(owner, factory);

    assert(
      `Custom component managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.4' | '3.13')\` (imported via \`import { capabilities } from '@ember/component';\`). Received: \`${JSON.stringify(
        (manager as ComponentManagerDelegate<unknown>).capabilities
      )}\` for: \`${manager}\``,
      isInternalManager(manager) || FROM_CAPABILITIES!.has(manager.capabilities)
    );

    return manager;
  }

  return undefined;
}

declare const INTERNAL_CAPABILITIES: unique symbol;

export interface InternalCapabilities {
  [INTERNAL_CAPABILITIES]: true;
}

export function buildCapabilities<T extends object>(capabilities: T): T & InternalCapabilities {
  if (DEBUG) {
    FROM_CAPABILITIES!.add(capabilities);
    Object.freeze(capabilities);
  }

  return capabilities as T & InternalCapabilities;
}
