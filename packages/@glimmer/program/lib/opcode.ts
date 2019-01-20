import { OpcodeSize, RuntimeOp, OpcodeHeap } from '@glimmer/interfaces';

export class RuntimeOpImpl implements RuntimeOp {
  public offset = 0;
  constructor(readonly heap: OpcodeHeap) {}

  get size() {
    let rawType = this.heap.getbyaddr(this.offset);
    return ((rawType & OpcodeSize.OPERAND_LEN_MASK) >> OpcodeSize.ARG_SHIFT) + 1;
  }

  get isMachine(): 0 | 1 {
    let rawType = this.heap.getbyaddr(this.offset);
    return rawType & OpcodeSize.MACHINE_MASK ? 1 : 0;
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
