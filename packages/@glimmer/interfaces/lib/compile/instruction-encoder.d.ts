import { MachineOp, Op } from '../vm-opcodes';
import { Operand } from './operands';
import { CompilerBuffer } from '../template';

export const enum OpcodeSize {
  ARG_SHIFT = 8,
  MAX_SIZE = 0b1111111111111111,
  TYPE_SIZE = 0b11111111,
  TYPE_MASK = 0b0000000011111111,
  OPERAND_LEN_MASK = 0b0000001100000000,
  MACHINE_MASK = 0b0000010000000000,
}

export interface InstructionEncoder {
  size: number;
  readonly buffer: CompilerBuffer;

  encode(type: MachineOp, machine: OpcodeSize.MACHINE_MASK, ...operands: Operand[]): void;
  encode(type: Op, machine: 0, ...operands: Operand[]): void;

  patch(position: number, target: number): void;
}
