import {
  CompileTimeHeap,
  SerializedHeap,
  STDLib,
  RuntimeHeap,
  StdlibOperand,
  RuntimeConstants,
  RuntimeProgram,
  CompilerArtifacts,
} from '@glimmer/interfaces';
import { DEBUG } from '@glimmer/local-debug-flags';
import { RuntimeConstantsImpl } from './constants';
import { RuntimeOpImpl } from './opcode';
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

export type Placeholder = [number, () => number];
export type StdlibPlaceholder = [number, StdlibOperand];

const PAGE_SIZE = 0x100000;

export class RuntimeHeapImpl implements RuntimeHeap {
  private heap: Uint32Array;
  private table: number[];

  constructor(serializedHeap: SerializedHeap) {
    let { buffer, table } = serializedHeap;
    this.heap = new Uint32Array(buffer);
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

  scopesizeof(handle: number): number {
    return scopesizeof(this.table, handle);
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
  private heap: Uint32Array;
  private placeholders: Placeholder[] = [];
  private stdlibs: StdlibPlaceholder[] = [];
  private table: number[];
  private offset = 0;
  private handle = 0;
  private capacity = PAGE_SIZE;

  constructor() {
    this.heap = new Uint32Array(PAGE_SIZE);
    this.table = [];
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
    return sizeof(this.table, handle);
  }

  scopesizeof(handle: number): number {
    return scopesizeof(this.table, handle);
  }

  free(handle: number): void {
    let info = this.table[handle + Size.INFO_OFFSET];
    this.table[handle + Size.INFO_OFFSET] = changeState(info, TableSlotState.Freed);
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
    let {
      table,
      table: { length },
      heap,
    } = this;

    for (let i = 0; i < length; i += Size.ENTRY_SIZE) {
      let offset = table[i];
      let info = table[i + Size.INFO_OFFSET];
      // @ts-ignore (this whole function is currently unused)
      let size = info & Size.SIZE_MASK;
      let state = info & (Size.STATE_MASK >> 30);

      if (state === TableSlotState.Purged) {
        continue;
      } else if (state === TableSlotState.Freed) {
        // transition to "already freed" aka "purged"
        // a good improvement would be to reuse
        // these slots
        table[i + Size.INFO_OFFSET] = changeState(info, TableSlotState.Purged);
        compactedSize += size;
      } else if (state === TableSlotState.Allocated) {
        for (let j = offset; j <= i + size; j++) {
          heap[j - compactedSize] = heap[j];
        }

        table[i] = offset - compactedSize;
      } else if (state === TableSlotState.Pointer) {
        table[i] = offset - compactedSize;
      }
    }

    this.offset = this.offset - compactedSize;
  }

  pushPlaceholder(valueFunc: () => number): void {
    this.sizeCheck();
    let address = this.offset++;
    this.heap[address] = Size.MAX_SIZE;
    this.placeholders.push([address, valueFunc]);
  }

  pushStdlib(operand: StdlibOperand): void {
    this.sizeCheck();
    let address = this.offset++;
    this.heap[address] = Size.MAX_SIZE;
    this.stdlibs.push([address, operand]);
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

  patchStdlibs(stdlib: STDLib): void {
    let { stdlibs } = this;

    for (let i = 0; i < stdlibs.length; i++) {
      let [address, { value }] = stdlibs[i];

      assert(
        this.getbyaddr(address) === Size.MAX_SIZE,
        `expected to find a placeholder value at ${address}`
      );
      this.setbyaddr(address, stdlib[value]);
    }

    this.stdlibs = [];
  }

  capture(stdlib: STDLib, offset = this.offset): SerializedHeap {
    this.patchPlaceholders();
    this.patchStdlibs(stdlib);

    // Only called in eager mode
    let buffer = slice(this.heap, 0, offset).buffer;
    return {
      handle: this.handle,
      table: this.table,
      buffer: buffer as ArrayBuffer,
    };
  }
}

export class RuntimeProgramImpl implements RuntimeProgram {
  [key: number]: never;

  static hydrate(artifacts: CompilerArtifacts) {
    let heap = new RuntimeHeapImpl(artifacts.heap);
    let constants = new RuntimeConstantsImpl(artifacts.constants);

    return new RuntimeProgramImpl(constants, heap);
  }

  private _opcode: RuntimeOpImpl;

  constructor(public constants: RuntimeConstants, public heap: RuntimeHeap) {
    this._opcode = new RuntimeOpImpl(this.heap);
  }

  opcode(offset: number): RuntimeOpImpl {
    this._opcode.offset = offset;
    return this._opcode;
  }
}

export function hydrateProgram(artifacts: CompilerArtifacts): RuntimeProgram {
  let heap = new RuntimeHeapImpl(artifacts.heap);
  let constants = new RuntimeConstantsImpl(artifacts.constants);

  return new RuntimeProgramImpl(constants, heap);
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

function sizeof(table: number[], handle: number) {
  if (DEBUG) {
    return table[handle + Size.SIZE_OFFSET];
  } else {
    return -1;
  }
}

function scopesizeof(table: number[], handle: number) {
  let info = table[handle + Size.INFO_OFFSET];
  return info >> 2;
}
