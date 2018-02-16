import { Op } from "@glimmer/vm";
import { CompilerBuffer } from '@glimmer/interfaces';

export const enum OpcodeSize {
  ARG_SHIFT = 8,
  MAX_SIZE  = 0b1111111111111111,
  TYPE_SIZE = 0b11111111,
  TYPE_MASK        = 0b0000000011111111,
  OPERAND_LEN_MASK = 0b0000001100000000,
  MACHINE_MASK     = 0b0000010000000000,
}

export type Operand = number | (() => number);

export class InstructionEncoder {
  constructor(public buffer: CompilerBuffer) {}
  typePos = 0;
  size = 0;

  encode(type: Op, machine: 0 | OpcodeSize.MACHINE_MASK, ...operands: Operand[]): void;
  encode(type: Op, machine: 0 | OpcodeSize.MACHINE_MASK) {
    if (type as number > OpcodeSize.TYPE_SIZE) {
      throw new Error(`Opcode type over 8-bits. Got ${type}.`);
    }

    this.buffer.push((type | machine | (arguments.length - 2 << OpcodeSize.ARG_SHIFT)));

    this.typePos = this.buffer.length - 1;

    for (let i = 2; i < arguments.length; i++) {
      let op = arguments[i];
      if (typeof op === 'number' && op > OpcodeSize.MAX_SIZE) {
        throw new Error(`Operand over 16-bits. Got ${op}.`);
      }
      this.buffer.push(op);
    };

    this.size = this.buffer.length;
  }

  patch(position: number, target: number) {
    if (this.buffer[position + 1] === -1) {
      this.buffer[position + 1] = target;
    } else {
      throw new Error('Trying to patch operand in populated slot instead of a reserved slot.');
    }
  }

  patchWith(position: number, target: number, operand: number) {
    if (this.buffer[position + 1] === -1) {
      this.buffer[position + 1] = target;
      this.buffer[position + 2] = operand;
    } else {
      throw new Error('Trying to patch operand in populated slot instead of a reserved slot.');
    }
  }
}
