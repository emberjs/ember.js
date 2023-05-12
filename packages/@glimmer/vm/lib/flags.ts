import type {
  ARG_SHIFT as IARG_SHIFT,
  AttributeHookCapability,
  CreateArgsCapability,
  CreateCallerCapability,
  CreateInstanceCapability,
  CurriedComponent,
  CurriedHelper,
  CurriedModifier,
  DynamicLayoutCapability,
  DynamicScopeCapability,
  DynamicTagCapability,
  ElementHookCapability,
  EmptyCapability,
  HasSubOwnerCapability,
  MACHINE_MASK as IMACHINE_MASK,
  MAX_SIZE as IMAX_SIZE,
  OPERAND_LEN_MASK as IOPERAND_LEN_MASK,
  PrepareArgsCapability,
  TYPE_MASK as ITYPE_MASK,
  TYPE_SIZE as ITYPE_SIZE,
  UpdateHookCapability,
  WillDestroyCapability,
  WrappedCapability,
} from '@glimmer/interfaces';

export const CurriedTypes = {
  Component: 0 satisfies CurriedComponent,
  Helper: 1 satisfies CurriedHelper,
  Modifier: 2 satisfies CurriedModifier,
} as const;

export const InternalComponentCapabilities = {
  Empty: 0 satisfies EmptyCapability,
  dynamicLayout: 0b0000000000001 satisfies DynamicLayoutCapability,
  dynamicTag: 0b0000000000010 satisfies DynamicTagCapability,
  prepareArgs: 0b0000000000100 satisfies PrepareArgsCapability,
  createArgs: 0b0000000001000 satisfies CreateArgsCapability,
  attributeHook: 0b0000000010000 satisfies AttributeHookCapability,
  elementHook: 0b0000000100000 satisfies ElementHookCapability,
  dynamicScope: 0b0000001000000 satisfies DynamicScopeCapability,
  createCaller: 0b0000010000000 satisfies CreateCallerCapability,
  updateHook: 0b0000100000000 satisfies UpdateHookCapability,
  createInstance: 0b0001000000000 satisfies CreateInstanceCapability,
  wrapped: 0b0010000000000 satisfies WrappedCapability,
  willDestroy: 0b0100000000000 satisfies WillDestroyCapability,
  hasSubOwner: 0b1000000000000 satisfies HasSubOwnerCapability,
} as const;

export const ARG_SHIFT = 8 as const satisfies IARG_SHIFT;
export const MAX_SIZE = 0x7fffffff as const satisfies IMAX_SIZE;
export const TYPE_SIZE = 0b11111111 as const satisfies ITYPE_SIZE;
export const TYPE_MASK = 0b00000000000000000000000011111111 as const satisfies ITYPE_MASK;
export const OPERAND_LEN_MASK =
  0b00000000000000000000001100000000 as const satisfies IOPERAND_LEN_MASK;
export const MACHINE_MASK = 0b00000000000000000000010000000000 as const satisfies IMACHINE_MASK;
