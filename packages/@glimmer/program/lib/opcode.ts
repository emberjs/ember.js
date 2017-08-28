import { Heap } from './program';

export class Opcode {
  public offset = 0;
  constructor(private heap: Heap) {}

  get type() {
    return this.heap.getbyaddr(this.offset);
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
