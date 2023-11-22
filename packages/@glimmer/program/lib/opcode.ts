import type { OpcodeHeap, RuntimeOp, SomeVmOp } from '@glimmer/interfaces';
import { ARG_SHIFT, MACHINE_MASK, OPERAND_LEN_MASK, TYPE_MASK } from '@glimmer/vm';

export class RuntimeOpImpl implements RuntimeOp {
  public offset = 0;
  constructor(readonly heap: OpcodeHeap) {}

  get size() {
    let rawType = this.heap.getbyaddr(this.offset);
    return ((rawType & OPERAND_LEN_MASK) >> ARG_SHIFT) + 1;
  }

  get isMachine(): 0 | 1 {
    let rawType = this.heap.getbyaddr(this.offset);
    return rawType & MACHINE_MASK ? 1 : 0;
  }

  get type(): SomeVmOp {
    return (this.heap.getbyaddr(this.offset) & TYPE_MASK) as SomeVmOp;
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
