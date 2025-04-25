import type {
  CompilerBuffer,
  InstructionEncoder,
  MACHINE_MASK,
  Operand,
  SomeVmOp,
  VmMachineOp,
  VmOp,
} from '@glimmer/interfaces';
import { ARG_SHIFT, MAX_SIZE, TYPE_SIZE } from '@glimmer/vm';

export class InstructionEncoderImpl implements InstructionEncoder {
  constructor(readonly buffer: CompilerBuffer) {}

  size = 0;

  encode(type: VmMachineOp, machine: MACHINE_MASK, ...operands: Operand[]): void;
  encode(type: VmOp, machine: 0, ...operands: Operand[]): void;
  encode(type: SomeVmOp, machine: 0 | MACHINE_MASK, ...args: Operand[]) {
    if ((type as number) > TYPE_SIZE) {
      throw new Error(`Opcode type over 8-bits. Got ${type}.`);
    }

    let first = type | machine | ((arguments.length - 2) << ARG_SHIFT);

    this.buffer.push(first);

    for (const op of args) {
      if (import.meta.env.DEV && typeof op === 'number' && op > MAX_SIZE) {
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
