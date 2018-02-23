import { ComponentCapabilities, Unique, Recast } from "@glimmer/interfaces";
import { check, CheckNumber } from "@glimmer/debug";

export type CapabilityFlags = Unique<"CapabilityFlag">;

export const enum Capability {
  DynamicLayout  = 0b0000000001,
  DynamicTag     = 0b0000000010,
  PrepareArgs    = 0b0000000100,
  CreateArgs     = 0b0000001000,
  AttributeHook  = 0b0000010000,
  ElementHook    = 0b0000100000,
  DynamicScope   = 0b0001000000,
  CreateCaller   = 0b0010000000,
  UpdateHook     = 0b0100000000,
  CreateInstance = 0b1000000000
}

/**
 * Converts a ComponentCapabilities object into a 32-bit integer representation.
 */
export function capabilityFlagsFrom(capabilities: ComponentCapabilities): CapabilityFlags {
  return (0 |
    (capabilities.dynamicLayout ? Capability.DynamicLayout : 0) |
    (capabilities.dynamicTag ? Capability.DynamicTag : 0) |
    (capabilities.prepareArgs ? Capability.PrepareArgs : 0) |
    (capabilities.createArgs ? Capability.CreateArgs : 0) |
    (capabilities.attributeHook ? Capability.AttributeHook : 0) |
    (capabilities.elementHook ? Capability.ElementHook : 0) |
    (capabilities.dynamicScope ? Capability.DynamicScope : 0) |
    (capabilities.createCaller ? Capability.CreateCaller : 0) |
    (capabilities.updateHook ? Capability.UpdateHook : 0) |
    (capabilities.createInstance ? Capability.CreateInstance : 0)
  ) as Recast<number, CapabilityFlags>;
}

export function hasCapability(capabilities: CapabilityFlags, capability: Capability): boolean {
  check(capabilities, CheckNumber);
  return !!((capabilities as Recast<CapabilityFlags, number>) & capability);
}
