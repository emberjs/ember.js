import { DEBUG } from '@glimmer/env';
import { TYPE_SIZE, MAX_SIZE, ARG_SHIFT } from '@glimmer/vm';

class InstructionEncoderImpl {
  constructor(buffer) {
    this.buffer = buffer;
  }
  size = 0;
  encode(type, machine, ...args) {
    if (type > TYPE_SIZE) {
      throw new Error(`Opcode type over 8-bits. Got ${type}.`);
    }
    let first = type | machine | arguments.length - 2 << ARG_SHIFT;
    this.buffer.push(first);
    for (const op of args) {
      if (DEBUG && typeof op === 'number' && op > MAX_SIZE) {
        throw new Error(`Operand over 32-bits. Got ${op}.`);
      }
      this.buffer.push(op);
    }
    this.size = this.buffer.length;
  }
  patch(position, target) {
    if (this.buffer[position + 1] === -1) {
      this.buffer[position + 1] = target;
    } else {
      throw new Error('Trying to patch operand in populated slot instead of a reserved slot.');
    }
  }
}

export { InstructionEncoderImpl };
