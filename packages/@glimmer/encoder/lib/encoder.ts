import {
  CompilerBuffer,
  Operand,
  MachineOp,
  Op,
  InstructionEncoder,
  OpcodeSize,
} from '@glimmer/interfaces';

export class InstructionEncoderImpl implements InstructionEncoder {
  constructor(readonly buffer: CompilerBuffer) {}

  size = 0;

  encode(type: MachineOp, machine: OpcodeSize.MACHINE_MASK, ...operands: Operand[]): void;
  encode(type: Op, machine: 0, ...operands: Operand[]): void;
  encode(type: Op | MachineOp, machine: 0 | OpcodeSize.MACHINE_MASK) {
    if ((type as number) > OpcodeSize.TYPE_SIZE) {
      throw new Error(`Opcode type over 8-bits. Got ${type}.`);
    }

    let first = type | machine | ((arguments.length - 2) << OpcodeSize.ARG_SHIFT);

    this.buffer.push(first);

    for (let i = 2; i < arguments.length; i++) {
      let op = arguments[i];
      if (typeof op === 'number' && op > OpcodeSize.MAX_SIZE) {
        throw new Error(`Operand over 32-bits. Got ${op}.`);
      }
      this.buffer.push(op);
    }

    this.size = this.buffer.length;
  }

  patch(position: number, target: number) {
    if (this.buffer[position + 1] === -1) {
      this.buffer[position + 1] = target;
    } else {
      throw new Error('Trying to patch operand in populated slot instead of a reserved slot.');
    }
  }
}
