import type { ProgramHeap, RuntimeOp, SomeVmOp } from '@glimmer/interfaces';
import { ARG_SHIFT, MACHINE_MASK, OPERAND_LEN_MASK, TYPE_MASK } from '@glimmer/vm/lib/flags';

/**
 * A cursor over the program heap. `seek` decodes the header word once and
 * caches `type`, `size` and `isMachine` as plain fields — the VM reads all
 * three for every instruction it executes.
 */
export class RuntimeOpImpl implements RuntimeOp {
  public offset = 0;
  public type: SomeVmOp = 0;
  public size = 0;
  public isMachine: 0 | 1 = 0;

  constructor(readonly heap: ProgramHeap) {}

  seek(offset: number): this {
    let header = this.heap.getbyaddr(offset);

    this.offset = offset;
    this.type = (header & TYPE_MASK) as SomeVmOp;
    this.size = ((header & OPERAND_LEN_MASK) >> ARG_SHIFT) + 1;
    this.isMachine = header & MACHINE_MASK ? 1 : 0;

    return this;
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
