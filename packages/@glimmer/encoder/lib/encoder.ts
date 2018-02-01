import { Op } from "@glimmer/vm";

export const ARG_SHIFT = 8;
const MAX_SIZE                = 0b1111111111111111;
export const TYPE_SIZE        = 0b11111111;
export const TYPE_MASK        = 0b0000000011111111;
export const OPERAND_LEN_MASK = 0b0000001100000000;
export const MACHINE_MASK     = 0b0000010000000000;

export type Operand = number | (() => number);

export class InstructionEncoder {
  constructor(public buffer: Operand[]) {}
  typePos = 0;
  size = 0;

  encode(type: Op, machine: 0 | typeof MACHINE_MASK, ...operands: Operand[]): void;
  encode(type: Op, machine: 0 | typeof MACHINE_MASK) {
    if (type > TYPE_SIZE) {
      throw new Error(`Opcode type over 8-bits. Got ${type}.`);
    }

    this.buffer.push((type | machine | (arguments.length - 2 << ARG_SHIFT)));

    this.typePos = this.buffer.length - 1;

    for (let i = 2; i < arguments.length; i++) {
      let op = arguments[i];
      if (typeof op === 'number' && op > MAX_SIZE) {
        throw new Error(`Operand over 16-bits. Got ${op}.`);
      }
      this.buffer.push(op);
    };

    this.size = this.buffer.length;
  }

  patch(position: number, operand: number) {
    if (this.buffer[position + 1] === -1) {
      this.buffer[position + 1] = operand;
    } else {
      throw new Error('Trying to patch operand in populated slot instead of a reserved slot.');
    }
  }
}
