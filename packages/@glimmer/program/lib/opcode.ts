import { Heap } from './program';
import { TYPE_MASK, OPERAND_LEN_MASK, ARG_SHIFT } from "@glimmer/encoder";

export class Opcode {
  public offset = 0;
  constructor(private heap: Heap) {}

  get size() {
    let rawType = this.heap.getbyaddr(this.offset);
    return ((rawType & OPERAND_LEN_MASK) >> ARG_SHIFT) + 1;
  }

  get type() {
    return (this.heap.getbyaddr(this.offset) & TYPE_MASK);
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
