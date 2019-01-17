import {
  CompileTimeProgram,
  Recast,
  VMHandle,
  RuntimeResolver,
  CompileTimeHeap,
} from '@glimmer/interfaces';
import { DEBUG } from '@glimmer/local-debug-flags';
import { Constants, WriteOnlyConstants, RuntimeConstants, ConstantPool } from './constants';
import { Opcode } from './opcode';
import { assert } from '@glimmer/util';

const enum TableSlotState {
  Allocated,
  Freed,
  Purged,
  Pointer,
}

const enum Size {
  ENTRY_SIZE = 3,
  INFO_OFFSET = 1,
  SIZE_OFFSET = 2,
  MAX_SIZE = 0b1111111111111111111111111111111,
  SCOPE_MASK = 0b1111111111111111111111111111100,
  STATE_MASK = 0b11,
}

function encodeTableInfo(scopeSize: number, state: number) {
  assert(scopeSize > -1 && state > -1, 'Size, scopeSize or state were less than 0');
  assert(state < 1 << 2, 'State is more than 2 bits');
  assert(scopeSize < 1 << 30, 'Scope is more than 30-bits');
  return state | (scopeSize << 2);
}

function changeState(info: number, newState: number) {
  assert(info > -1 && newState > -1, 'Info or state were less than 0');
  assert(newState < 1 << 2, 'State is more than 2 bits');
  assert(info < 1 << 30, 'Info is more than 30 bits');
  return info | (newState << 30);
}

export interface SerializedHeap {
  buffer: ArrayBuffer;
  table: number[];
  handle: number;
}

export type Placeholder = [number, () => number];

const PAGE_SIZE = 0x100000;

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
export class Heap implements CompileTimeHeap {
  private heap: Uint32Array;
  private placeholders: Placeholder[] = [];
  private table: number[];
  private offset = 0;
  private handle = 0;
  private capacity = PAGE_SIZE;

  constructor(serializedHeap?: SerializedHeap) {
    if (serializedHeap) {
      let { buffer, table, handle } = serializedHeap;
      this.heap = new Uint32Array(buffer);
      this.table = table;
      this.offset = this.heap.length;
      this.handle = handle;
      this.capacity = 0;
    } else {
      this.heap = new Uint32Array(PAGE_SIZE);
      this.table = [];
    }
  }

  push(item: number): void {
    this.sizeCheck();
    this.heap[this.offset++] = item;
  }

  private sizeCheck() {
    if (this.capacity === 0) {
      let heap = slice(this.heap, 0, this.offset);
      this.heap = new Uint32Array(heap.length + PAGE_SIZE);
      this.heap.set(heap, 0);
      this.capacity = PAGE_SIZE;
    }
    this.capacity--;
  }

  getbyaddr(address: number): number {
    return this.heap[address];
  }

  setbyaddr(address: number, value: number) {
    this.heap[address] = value;
  }

  malloc(): number {
    // push offset, info, size
    this.table.push(this.offset, 0, 0);
    let handle = this.handle;
    this.handle += Size.ENTRY_SIZE;
    return handle;
  }

  finishMalloc(handle: number, scopeSize: number): void {
    if (DEBUG) {
      let start = this.table[handle];
      let finish = this.offset;
      let instructionSize = finish - start;
      this.table[handle + Size.SIZE_OFFSET] = instructionSize;
    }
    this.table[handle + Size.INFO_OFFSET] = encodeTableInfo(scopeSize, TableSlotState.Allocated);
  }

  size(): number {
    return this.offset;
  }

  // It is illegal to close over this address, as compaction
  // may move it. However, it is legal to use this address
  // multiple times between compactions.
  getaddr(handle: number): number {
    return this.table[handle];
  }

  gethandle(address: number): number {
    this.table.push(address, encodeTableInfo(0, TableSlotState.Pointer), 0);
    let handle = this.handle;
    this.handle += Size.ENTRY_SIZE;
    return handle;
  }

  sizeof(handle: number): number {
    if (DEBUG) {
      return this.table[(handle as Recast<VMHandle, number>) + Size.SIZE_OFFSET];
    }
    return -1;
  }

  scopesizeof(handle: number): number {
    let info = this.table[(handle as Recast<VMHandle, number>) + Size.INFO_OFFSET];
    return info >> 2;
  }

  free(handle: VMHandle): void {
    let info = this.table[(handle as Recast<VMHandle, number>) + Size.INFO_OFFSET];
    this.table[(handle as Recast<VMHandle, number>) + Size.INFO_OFFSET] = changeState(
      info,
      TableSlotState.Freed
    );
  }

  pushPlaceholder(valueFunc: () => number): void {
    this.sizeCheck();
    let address = this.offset++;
    this.heap[address] = Size.MAX_SIZE;
    this.placeholders.push([address, valueFunc]);
  }

  private patchPlaceholders() {
    let { placeholders } = this;

    for (let i = 0; i < placeholders.length; i++) {
      let [address, getValue] = placeholders[i];

      assert(
        this.getbyaddr(address) === Size.MAX_SIZE,
        `expected to find a placeholder value at ${address}`
      );
      this.setbyaddr(address, getValue());
    }
  }

  capture(offset = this.offset): SerializedHeap {
    this.patchPlaceholders();

    // Only called in eager mode
    let buffer = slice(this.heap, 0, offset).buffer;
    return {
      handle: this.handle,
      table: this.table,
      buffer: buffer as ArrayBuffer,
    };
  }
}

export class WriteOnlyProgram implements CompileTimeProgram {
  [key: number]: never;

  private _opcode: Opcode;

  constructor(
    public constants: WriteOnlyConstants = new WriteOnlyConstants(),
    public heap = new Heap()
  ) {
    this._opcode = new Opcode(this.heap);
  }

  opcode(offset: number): Opcode {
    this._opcode.offset = offset;
    return this._opcode;
  }
}

export class RuntimeProgram<Locator> {
  [key: number]: never;

  static hydrate<Locator>(
    rawHeap: SerializedHeap,
    pool: ConstantPool,
    resolver: RuntimeResolver<Locator>
  ) {
    let heap = new Heap(rawHeap);
    let constants = new RuntimeConstants(resolver, pool);

    return new RuntimeProgram(constants, heap);
  }

  private _opcode: Opcode;

  constructor(public constants: RuntimeConstants<Locator>, public heap: Heap) {
    this._opcode = new Opcode(this.heap);
  }

  opcode(offset: number): Opcode {
    this._opcode.offset = offset;
    return this._opcode;
  }
}

export class Program<Locator> extends WriteOnlyProgram {
  public constants!: Constants<Locator>;
}

function slice(arr: Uint32Array, start: number, end: number): Uint32Array {
  if (arr.slice !== undefined) {
    return arr.slice(start, end);
  }

  let ret = new Uint32Array(end);

  for (; start < end; start++) {
    ret[start] = arr[start];
  }

  return ret;
}
