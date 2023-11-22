import type {
  AttributeHookCapability,
  Capabilities,
  CapabilityMask,
  CreateArgsCapability,
  CreateCallerCapability,
  CreateInstanceCapability,
  DynamicLayoutCapability,
  DynamicScopeCapability,
  DynamicTagCapability,
  ElementHookCapability,
  Expand,
  HasSubOwnerCapability,
  InternalComponentCapability,
  InternalComponentManager,
  PrepareArgsCapability,
  UpdateHookCapability,
  WillDestroyCapability,
  WithCreateInstance,
  WithDynamicLayout,
  WithPrepareArgs,
  WithSubOwner,
  WithUpdateHook,
  WrappedCapability,
} from '@glimmer/interfaces';
import { check, CheckNumber } from '@glimmer/debug';
import { InternalComponentCapabilities } from '@glimmer/vm';

export const FROM_CAPABILITIES = import.meta.env.DEV ? new WeakSet() : undefined;

export function buildCapabilities<T extends object>(capabilities: T): T & Capabilities {
  if (import.meta.env.DEV) {
    FROM_CAPABILITIES!.add(capabilities);
    Object.freeze(capabilities);
  }

  return capabilities as T & Capabilities;
}

const EMPTY = InternalComponentCapabilities.Empty;

type CapabilityOptions = Expand<{
  [P in keyof Omit<typeof InternalComponentCapabilities, 'Empty'>]?: boolean | undefined;
}>;

/**
 * Converts a ComponentCapabilities object into a 32-bit integer representation.
 */
export function capabilityFlagsFrom(capabilities: CapabilityOptions): CapabilityMask {
  return (EMPTY |
    capability(capabilities, 'dynamicLayout') |
    capability(capabilities, 'dynamicTag') |
    capability(capabilities, 'prepareArgs') |
    capability(capabilities, 'createArgs') |
    capability(capabilities, 'attributeHook') |
    capability(capabilities, 'elementHook') |
    capability(capabilities, 'dynamicScope') |
    capability(capabilities, 'createCaller') |
    capability(capabilities, 'updateHook') |
    capability(capabilities, 'createInstance') |
    capability(capabilities, 'wrapped') |
    capability(capabilities, 'willDestroy') |
    capability(capabilities, 'hasSubOwner')) as CapabilityMask;
}

function capability(
  capabilities: CapabilityOptions,
  capability: keyof CapabilityOptions
): InternalComponentCapability {
  return capabilities[capability] ? InternalComponentCapabilities[capability] : EMPTY;
}

export type InternalComponentCapabilityFor<C extends InternalComponentCapability> =
  C extends DynamicLayoutCapability
    ? WithDynamicLayout
    : C extends DynamicTagCapability
      ? InternalComponentManager
      : C extends PrepareArgsCapability
        ? WithPrepareArgs
        : C extends CreateArgsCapability
          ? InternalComponentManager
          : C extends AttributeHookCapability
            ? InternalComponentManager
            : C extends ElementHookCapability
              ? InternalComponentManager
              : C extends DynamicScopeCapability
                ? InternalComponentManager
                : C extends CreateCallerCapability
                  ? InternalComponentManager
                  : C extends UpdateHookCapability
                    ? WithUpdateHook
                    : C extends CreateInstanceCapability
                      ? WithCreateInstance
                      : C extends WrappedCapability
                        ? InternalComponentManager
                        : C extends WillDestroyCapability
                          ? InternalComponentManager
                          : C extends HasSubOwnerCapability
                            ? WithSubOwner
                            : never;

export function managerHasCapability<F extends InternalComponentCapability>(
  _manager: InternalComponentManager,
  capabilities: CapabilityMask,
  capability: F
): _manager is InternalComponentCapabilityFor<F> {
  check(capabilities, CheckNumber);
  return !!(capabilities & capability);
}

export function hasCapability(
  capabilities: CapabilityMask,
  capability: InternalComponentCapability
): boolean {
  check(capabilities, CheckNumber);
  return !!(capabilities & capability);
}
