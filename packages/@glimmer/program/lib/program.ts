
import { CompileTimeProgram, Recast, VMHandle } from "@glimmer/interfaces";
import { DEBUG } from "@glimmer/local-debug-flags";
import { Constants, WriteOnlyConstants, RuntimeConstants } from './constants';
import { Opcode } from './opcode';

enum TableSlotState {
  Allocated,
  Freed,
  Purged,
  Pointer
}

const ENTRY_SIZE = 2;
const INFO_OFFSET = 1;
const SIZE_MASK =  0b00000000000000001111111111111111;
const SCOPE_MASK = 0b00111111111111110000000000000000;
const STATE_MASK = 0b11000000000000000000000000000000;

function encodeTableInfo(size: number, scopeSize: number, state: number) {
  return size | (scopeSize << 16) | state << 30;
}

function changeState(info: number, newState: number) {
  return info | newState << 30;
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
 * | ... | hp (u32) |       info (u32)          |
 * | ... |  Handle  | Size | Scope Size | State |
 * | ... | 32-bits  | 16b  |    14b     |  2b   |
 *
 * With this information we effectively have the ability to
 * control when we want to free memory. That being said you
 * can not free during execution as raw address are only
 * valid during the execution. This means you cannot close
 * over them as you will have a bad memory access exception.
 */
export class Heap {
  private heap: Uint16Array | Array<number>;
  private table: number[];
  private offset = 0;
  private handle = 0;

  constructor(serializedHeap?: { buffer: ArrayBuffer, table: number[], handle: number }) {
    if (serializedHeap) {
      let { buffer, table, handle } = serializedHeap;
      this.heap = new Uint16Array(buffer);
      this.table = table;
      this.offset = this.heap.length;
      this.handle = handle;
    } else {
      this.heap = new Uint16Array(0x100000);
      this.table = [];
    }
  }

  push(item: number): void {
    this.heap[this.offset++] = item;
  }

  getbyaddr(address: number): number {
    return this.heap[address];
  }

  setbyaddr(address: number, value: number) {
    this.heap[address] = value;
  }

  malloc(): VMHandle {
    this.table.push(this.offset, 0);
    let handle = this.handle;
    this.handle += ENTRY_SIZE;
    return handle as Recast<number, VMHandle>;
  }

  finishMalloc(handle: VMHandle, scopeSize: number): void {
    let start = this.table[handle as Recast<VMHandle, number>];
    let finish = this.offset;
    let instructionSize = finish - start;
    let info = encodeTableInfo(instructionSize, scopeSize, TableSlotState.Allocated);
    this.table[(handle as Recast<VMHandle, number>) + INFO_OFFSET] = info;
  }

  size(): number {
    return this.offset;
  }

  // It is illegal to close over this address, as compaction
  // may move it. However, it is legal to use this address
  // multiple times between compactions.
  getaddr(handle: VMHandle): number {
    return this.table[handle as Recast<VMHandle, number>];
  }

  gethandle(address: number): VMHandle {
    this.table.push(address, encodeTableInfo(0, 0, TableSlotState.Pointer));
    let handle = this.handle;
    this.handle += ENTRY_SIZE;
    return handle as Recast<number, VMHandle>;
  }

  sizeof(handle: VMHandle): number {
    if (DEBUG) {
      let info = this.table[(handle as Recast<VMHandle, number>) + INFO_OFFSET];
      return info & SIZE_MASK;
    }
    return -1;
  }

  scopesizeof(handle: VMHandle): number {
    let info = this.table[(handle as Recast<VMHandle, number>) + INFO_OFFSET];
    return (info & SCOPE_MASK) >> 16;
  }

  free(handle: VMHandle): void {
    let info = this.table[(handle as Recast<VMHandle, number>) + INFO_OFFSET];
    this.table[(handle as Recast<VMHandle, number>) + INFO_OFFSET] = changeState(info, TableSlotState.Freed);
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
    let { table, table: { length }, heap } = this;

    for (let i=0; i<length; i+=ENTRY_SIZE) {
      let offset = table[i];
      let info = table[i + INFO_OFFSET];
      let size = info & SIZE_MASK;
      let state = info & STATE_MASK >> 30;

      if (state === TableSlotState.Purged) {
        continue;
      } else if (state === TableSlotState.Freed) {
        // transition to "already freed" aka "purged"
        // a good improvement would be to reuse
        // these slots
        table[i + INFO_OFFSET] = changeState(info, TableSlotState.Purged);
        compactedSize += size;
      } else if (state === TableSlotState.Allocated) {
        for (let j=offset; j<=i+size; j++) {
          heap[j - compactedSize] = heap[j];
        }

        table[i] = offset - compactedSize;
      } else if (state === TableSlotState.Pointer) {
        table[i] = offset - compactedSize;
      }
    }

    this.offset = this.offset - compactedSize;
  }

  capture() {
    // Only called in eager mode
    let buffer = slice(this.heap, 0, this.offset);
    return {
      handle: this.handle,
      table: this.table,
      buffer: buffer as ArrayBuffer
    };
  }
}

export class WriteOnlyProgram implements CompileTimeProgram {
  [key: number]: never;

  private _opcode: Opcode;

  constructor(public constants: WriteOnlyConstants = new WriteOnlyConstants(), public heap = new Heap()) {
    this._opcode = new Opcode(this.heap);
  }

  opcode(offset: number): Opcode {
    this._opcode.offset = offset;
    return this._opcode;
  }
}

export class RuntimeProgram<Specifier> {
  [key: number]: never;

  private _opcode: Opcode;

  constructor(public constants: RuntimeConstants<Specifier>, public heap: Heap) {
    this._opcode = new Opcode(this.heap);
  }

  opcode(offset: number): Opcode {
    this._opcode.offset = offset;
    return this._opcode;
  }
}

export class Program<Specifier> extends WriteOnlyProgram {
  public constants: Constants<Specifier>;
}

function slice(arr: Uint16Array | number[], start: number, end: number) {
  if (arr instanceof Uint16Array) {
    if (arr.slice !== undefined) {
      return arr.slice(start, end).buffer;
    }

    let ret = new Uint16Array(end);

    for (; start < end; start++) {
      ret[start]  = arr[start];
    }

    return ret.buffer;
  }

  return null;
}
