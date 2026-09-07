import type { DynamicAttributeApplier, Nullable, Reference } from '@glimmer/interfaces';

import type { VM } from '../append';
import { isConstRef, valueForRef } from '@glimmer/reference/lib/reference';

import { UpdateDynamicAttributeOpcode } from '../../compiled/opcodes/dom';
import { setDynamicAttribute } from './dynamic';

/**
 * Applies a component element attribute whose value is a reference. The
 * `ComponentAttr` handler hands this to the element operations, so a
 * component with only static attributes does not carry the dynamic
 * attribute code.
 */
function apply(
  vm: VM,
  name: string,
  value: Reference,
  namespace: Nullable<string>,
  trusting: boolean
): void {
  let attribute = setDynamicAttribute(
    vm.tree(),
    name,
    valueForRef(value),
    trusting,
    namespace,
    vm.env
  );

  if (!isConstRef(value)) {
    vm.updateWith(new UpdateDynamicAttributeOpcode(value, attribute, vm.env));
  }
}

export const applyDynamicAttribute: DynamicAttributeApplier = apply;
