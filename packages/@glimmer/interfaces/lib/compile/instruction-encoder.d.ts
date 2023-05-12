import type { CompilerBuffer } from '../template';
import type { VmMachineOp, VmOp } from '../vm-opcodes';
import type { Operand } from './operands';

export type ARG_SHIFT = 8;
export type MAX_SIZE = 0x7fffffff;
export type TYPE_SIZE = 0b11111111;
export type TYPE_MASK = 0b00000000000000000000000011111111;
export type OPERAND_LEN_MASK = 0b00000000000000000000001100000000;
export type MACHINE_MASK = 0b00000000000000000000010000000000;

export interface InstructionEncoder {
  size: number;
  readonly buffer: CompilerBuffer;

  encode(type: VmMachineOp, machine: MACHINE_MASK, ...operands: Operand[]): void;
  encode(type: VmOp, machine: 0, ...operands: Operand[]): void;

  patch(position: number, target: number): void;
}
