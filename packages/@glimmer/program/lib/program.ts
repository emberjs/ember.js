import {
  CompileTimeHeap,
  SerializedHeap,
  RuntimeHeap,
  StdLibOperand,
  RuntimeConstants,
  RuntimeProgram,
  ResolutionTimeConstants,
} from '@glimmer/interfaces';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { RuntimeOpImpl } from './opcode';
import { assert } from '@glimmer/util';

const enum TableSlotState {
  Allocated,
  Freed,
  Purged,
  Pointer,
}

export type Placeholder = [number, () => number];
export type StdlibPlaceholder = [number, StdLibOperand];

const PAGE_SIZE = 0x100000;

export class RuntimeHeapImpl implements RuntimeHeap {
  private heap: Int32Array;
  private table: number[];

  constructor(serializedHeap: SerializedHeap) {
    let { buffer, table } = serializedHeap;
    this.heap = new Int32Array(buffer);
    this.table = table;
  }

  // It is illegal to close over this address, as compaction
  // may move it. However, it is legal to use this address
  // multiple times between compactions.
  getaddr(handle: number): number {
    return this.table[handle];
  }

  getbyaddr(address: number): number {
    assert(this.heap[address] !== undefined, 'Access memory out of bounds of the heap');
    return this.heap[address];
  }

  sizeof(handle: number): number {
    return sizeof(this.table, handle);
  }
}

export function hydrateHeap(serializedHeap: SerializedHeap): RuntimeHeap {
  return new RuntimeHeapImpl(serializedHeap);
}

/**
 * The Heap is responsible for dynamically allocating
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
 * With this information we effectively have the ability to
 * control when we want to free memory. That being said you
 * can not free during execution as raw address are only
 * valid during the execution. This means you cannot close
 * over them as you will have a bad memory access exception.
 */
export class HeapImpl implements CompileTimeHeap, RuntimeHeap {
  offset = 0;

  private heap: Int32Array;
  private handleTable: number[];
  private handleState: TableSlotState[];
  private handle = 0;

  constructor() {
    this.heap = new Int32Array(PAGE_SIZE);
    this.handleTable = [];
    this.handleState = [];
  }

  push(item: number): void {
    this.sizeCheck();
    this.heap[this.offset++] = item;
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
    return this.heap[address];
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
    // @TODO: At the moment, garbage collection isn't actually used, so this is
    // wrapped to prevent us from allocating extra space in prod. In the future,
    // if we start using the compact API, we should change this.
    if (LOCAL_DEBUG) {
      this.handleState[handle] = TableSlotState.Allocated;
    }
  }

  size(): number {
    return this.offset;
  }

  // It is illegal to close over this address, as compaction
  // may move it. However, it is legal to use this address
  // multiple times between compactions.
  getaddr(handle: number): number {
    return this.handleTable[handle];
  }

  sizeof(handle: number): number {
    return sizeof(this.handleTable, handle);
  }

  free(handle: number): void {
    this.handleState[handle] = TableSlotState.Freed;
  }

  /**
   * The heap uses the [Mark-Compact Algorithm](https://en.wikipedia.org/wiki/Mark-compact_algorithm) to shift
   * reachable memory to the bottom of the heap and freeable
   * memory to the top of the heap. When we have shifted all
   * the reachable memory to the top of the heap, we move the
   * offset to the next free position.
   */
  compact(): void {
    let compactedSize = 0;
    let { handleTable, handleState, heap } = this;

    for (let i = 0; i < length; i++) {
      let offset = handleTable[i];
      let size = handleTable[i + 1] - offset;
      let state = handleState[i];

      if (state === TableSlotState.Purged) {
        continue;
      } else if (state === TableSlotState.Freed) {
        // transition to "already freed" aka "purged"
        // a good improvement would be to reuse
        // these slots
        handleState[i] = TableSlotState.Purged;
        compactedSize += size;
      } else if (state === TableSlotState.Allocated) {
        for (let j = offset; j <= i + size; j++) {
          heap[j - compactedSize] = heap[j];
        }

        handleTable[i] = offset - compactedSize;
      } else if (state === TableSlotState.Pointer) {
        handleTable[i] = offset - compactedSize;
      }
    }

    this.offset = this.offset - compactedSize;
  }

  capture(offset = this.offset): SerializedHeap {
    // Only called in eager mode
    let buffer = slice(this.heap, 0, offset).buffer;
    return {
      handle: this.handle,
      table: this.handleTable,
      buffer: buffer as ArrayBuffer,
    };
  }
}

export class RuntimeProgramImpl implements RuntimeProgram {
  [key: number]: never;

  private _opcode: RuntimeOpImpl;

  constructor(
    public constants: RuntimeConstants & ResolutionTimeConstants,
    public heap: RuntimeHeap
  ) {
    this._opcode = new RuntimeOpImpl(this.heap);
  }

  opcode(offset: number): RuntimeOpImpl {
    this._opcode.offset = offset;
    return this._opcode;
  }
}

function slice(arr: Int32Array, start: number, end: number): Int32Array {
  if (arr.slice !== undefined) {
    return arr.slice(start, end);
  }

  let ret = new Int32Array(end);

  for (; start < end; start++) {
    ret[start] = arr[start];
  }

  return ret;
}

function sizeof(table: number[], handle: number) {
  if (LOCAL_DEBUG) {
    return table[handle + 1] - table[handle];
  } else {
    return -1;
  }
}
