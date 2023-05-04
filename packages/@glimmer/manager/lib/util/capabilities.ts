import { check, CheckNumber } from '@glimmer/debug';
import { DEBUG } from '@glimmer/env';
import {
  Capabilities,
  InternalComponentCapabilities,
  InternalComponentCapability,
  InternalComponentManager,
  WithCreateInstance,
  WithDynamicLayout,
  WithPrepareArgs,
  WithSubOwner,
  WithUpdateHook,
} from '@glimmer/interfaces';
import { _WeakSet } from '@glimmer/util';

export const FROM_CAPABILITIES = DEBUG ? new _WeakSet() : undefined;

export function buildCapabilities<T extends object>(capabilities: T): T & Capabilities {
  if (DEBUG) {
    FROM_CAPABILITIES!.add(capabilities);
    Object.freeze(capabilities);
  }

  return capabilities as T & Capabilities;
}

/**
 * Converts a ComponentCapabilities object into a 32-bit integer representation.
 */
export function capabilityFlagsFrom(
  capabilities: InternalComponentCapabilities
): InternalComponentCapability {
  return (
    0 |
    (capabilities.dynamicLayout ? InternalComponentCapability.DynamicLayout : 0) |
    (capabilities.dynamicTag ? InternalComponentCapability.DynamicTag : 0) |
    (capabilities.prepareArgs ? InternalComponentCapability.PrepareArgs : 0) |
    (capabilities.createArgs ? InternalComponentCapability.CreateArgs : 0) |
    (capabilities.attributeHook ? InternalComponentCapability.AttributeHook : 0) |
    (capabilities.elementHook ? InternalComponentCapability.ElementHook : 0) |
    (capabilities.dynamicScope ? InternalComponentCapability.DynamicScope : 0) |
    (capabilities.createCaller ? InternalComponentCapability.CreateCaller : 0) |
    (capabilities.updateHook ? InternalComponentCapability.UpdateHook : 0) |
    (capabilities.createInstance ? InternalComponentCapability.CreateInstance : 0) |
    (capabilities.wrapped ? InternalComponentCapability.Wrapped : 0) |
    (capabilities.willDestroy ? InternalComponentCapability.WillDestroy : 0) |
    (capabilities.hasSubOwner ? InternalComponentCapability.HasSubOwner : 0)
  );
}

export interface InternalComponentCapabilityMap {
  [InternalComponentCapability.DynamicLayout]: WithDynamicLayout;
  [InternalComponentCapability.DynamicTag]: InternalComponentManager;
  [InternalComponentCapability.PrepareArgs]: WithPrepareArgs;
  [InternalComponentCapability.CreateArgs]: InternalComponentManager;
  [InternalComponentCapability.AttributeHook]: InternalComponentManager;
  [InternalComponentCapability.ElementHook]: InternalComponentManager;
  [InternalComponentCapability.DynamicScope]: InternalComponentManager;
  [InternalComponentCapability.CreateCaller]: InternalComponentManager;
  [InternalComponentCapability.UpdateHook]: WithUpdateHook;
  [InternalComponentCapability.CreateInstance]: WithCreateInstance;
  [InternalComponentCapability.Wrapped]: InternalComponentManager;
  [InternalComponentCapability.WillDestroy]: InternalComponentManager;
  [InternalComponentCapability.HasSubOwner]: WithSubOwner;
}

export function managerHasCapability<F extends keyof InternalComponentCapabilityMap>(
  _manager: InternalComponentManager,
  capabilities: InternalComponentCapability,
  capability: F
): _manager is InternalComponentCapabilityMap[F] {
  check(capabilities, CheckNumber);
  return !!(capabilities & capability);
}

export function hasCapability<F extends keyof InternalComponentCapabilityMap>(
  capabilities: InternalComponentCapability,
  capability: F
): boolean {
  check(capabilities, CheckNumber);
  return !!(capabilities & capability);
}
