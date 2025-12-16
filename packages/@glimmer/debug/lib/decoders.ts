import type { ProgramConstants } from '@glimmer/interfaces';
import {
  CURRIED_COMPONENT,
  CURRIED_HELPER,
  CURRIED_MODIFIER,
  decodeHandle,
  decodeImmediate,
} from '@glimmer/constants';
import { $fp, $pc, $ra, $s0, $s1, $sp, $t0, $t1, $v0 } from '@glimmer/vm';

import type { Primitive, RegisterName } from './dism/dism';

export function decodeCurry(curry: number): 'component' | 'helper' | 'modifier' {
  switch (curry) {
    case CURRIED_COMPONENT:
      return 'component';
    case CURRIED_HELPER:
      return 'helper';
    case CURRIED_MODIFIER:
      return 'modifier';
    default:
      throw Error(`Unexpected curry value: ${curry}`);
  }
}

export function decodeRegister(register: number): RegisterName {
  switch (register) {
    case $pc:
      return '$pc';
    case $ra:
      return '$ra';
    case $fp:
      return '$fp';
    case $sp:
      return '$sp';
    case $s0:
      return '$s0';
    case $s1:
      return '$s1';
    case $t0:
      return '$t0';
    case $t1:
      return '$t1';
    case $v0:
      return '$v0';
    default:
      return `$bug${register}`;
  }
}

export function decodePrimitive(primitive: number, constants: ProgramConstants): Primitive {
  if (primitive >= 0) {
    return constants.getValue(decodeHandle(primitive));
  }
  return decodeImmediate(primitive);
}
