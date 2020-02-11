import { MachineOp, Op } from '../vm-opcodes';
import { Operand } from './operands';
import { CompilerBuffer } from '../template';

export const enum OpcodeSize {
  ARG_SHIFT = 8,
  MAX_SIZE = 0x7fffffff,
  TYPE_SIZE = 0b11111111,
  TYPE_MASK = 0b00000000000000000000000011111111,
  OPERAND_LEN_MASK = 0b00000000000000000000001100000000,
  MACHINE_MASK = 0b00000000000000000000010000000000,
}

export interface InstructionEncoder {
  size: number;
  readonly buffer: CompilerBuffer;

  encode(type: MachineOp, machine: OpcodeSize.MACHINE_MASK, ...operands: Operand[]): void;
  encode(type: Op, machine: 0, ...operands: Operand[]): void;

  patch(position: number, target: number): void;
}
