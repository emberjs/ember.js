import { Heap } from './program';
import { OpcodeSize } from '@glimmer/encoder';

export class Opcode {
  public offset = 0;
  constructor(private heap: Heap) {}

  get size() {
    let rawType = this.heap.getbyaddr(this.offset);
    return ((rawType & OpcodeSize.OPERAND_LEN_MASK) >> OpcodeSize.ARG_SHIFT) + 1;
  }

  get isMachine() {
    let rawType = this.heap.getbyaddr(this.offset);
    return rawType & OpcodeSize.MACHINE_MASK;
  }

  get type() {
    return this.heap.getbyaddr(this.offset) & OpcodeSize.TYPE_MASK;
  }

  get op1() {
    return this.heap.getbyaddr(this.offset + 1);
  }

  get op2() {
    return this.heap.getbyaddr(this.offset + 2);
  }

  get op3() {
    return this.heap.getbyaddr(this.offset + 3);
  }
}
