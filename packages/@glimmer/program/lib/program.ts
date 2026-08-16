import type { Program, ProgramConstants, ProgramHeap, StdLibOperand } from '@glimmer/interfaces';
import { unwrap } from '@glimmer/debug-util/lib/platform-utils';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { MACHINE_MASK } from '@glimmer/vm/lib/flags';

import { RuntimeOpImpl } from './opcode';

export type Placeholder = [number, () => number];
export type StdlibPlaceholder = [number, StdLibOperand];

const PAGE_SIZE = 0x100000;

/**
 * The Program Heap is responsible for dynamically allocating
 * memory in which we read/write the VM's instructions
 * from/to. When we malloc we pass out a VMHandle, which
 * is used as an indirect way of accessing the memory during
 * execution of the VM. Internally we track the different
 * regions of the memory in an int array known as the table.
 *
 * The table 32-bit aligned and has the following layout:
 *
 * | ... | hp (u32) |       info (u32)   | size (u32) |
 * | ... |  Handle  | Scope Size | State | Size       |
 * | ... | 32bits   | 30bits     | 2bits | 32bit      |
 *
 * Memory is never reclaimed: templates live for the lifetime of the
 * application, so the heap only ever grows.
 */
export class ProgramHeapImpl implements ProgramHeap {
  offset = 0;

  private heap: Int32Array;
  private handleTable: number[];

  constructor() {
    this.heap = new Int32Array(PAGE_SIZE);
    this.handleTable = [];
  }
  entries(): number {
    return this.offset;
  }

  pushRaw(value: number): void {
    this.sizeCheck();
    this.heap[this.offset++] = value;
  }

  pushOp(item: number): void {
    this.pushRaw(item);
  }

  pushMachine(item: number): void {
    this.pushRaw(item | MACHINE_MASK);
  }

  private sizeCheck() {
    let { heap } = this;

    if (this.offset === this.heap.length) {
      let newHeap = new Int32Array(heap.length + PAGE_SIZE);
      newHeap.set(heap, 0);
      this.heap = newHeap;
    }
  }

  getbyaddr(address: number): number {
    return unwrap(this.heap[address]);
  }

  setbyaddr(address: number, value: number) {
    this.heap[address] = value;
  }

  malloc(): number {
    // push offset, info, size
    this.handleTable.push(this.offset);
    return this.handleTable.length - 1;
  }

  finishMalloc(handle: number): void {
    // Only the debug tooling needs to know how big a template is, and tracking
    // it costs a table slot per handle, so it's debug-only.
    if (LOCAL_DEBUG) {
      this.handleTable[handle + 1] = this.offset;
    }
  }

  size(): number {
    return this.offset;
  }

  getaddr(handle: number): number {
    return unwrap(this.handleTable[handle]);
  }

  sizeof(handle: number): number {
    return sizeof(this.handleTable, handle);
  }
}

export class ProgramImpl implements Program {
  [key: number]: never;

  private _opcode: RuntimeOpImpl;

  constructor(
    public constants: ProgramConstants,
    public heap: ProgramHeap
  ) {
    this._opcode = new RuntimeOpImpl(this.heap);
  }

  opcode(offset: number): RuntimeOpImpl {
    return this._opcode.seek(offset);
  }
}

function sizeof(table: number[], handle: number) {
  if (LOCAL_DEBUG) {
    return unwrap(table[handle + 1]) - unwrap(table[handle]);
  } else {
    return -1;
  }
}
