import { ComponentCapabilities, Unique, Recast } from "@glimmer/interfaces";
import { check, CheckNumber } from "@glimmer/debug";

export type CapabilityFlags = Unique<"CapabilityFlag">;

export const enum Capability {
  DynamicLayout = 0b000001,
  DynamicTag    = 0b000010,
  PrepareArgs   = 0b000100,
  CreateArgs    = 0b001000,
  AttributeHook = 0b010000,
  ElementHook   = 0b100000
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
    (capabilities.elementHook ? Capability.ElementHook : 0)) as Recast<number, CapabilityFlags>;
}

export function hasCapability(capabilities: CapabilityFlags, capability: Capability): boolean {
  check(capabilities, CheckNumber);
  return !!((capabilities as Recast<CapabilityFlags, number>) & capability);
}
