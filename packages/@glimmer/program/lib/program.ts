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
  ENTRY_SIZE = 2,
  INFO_OFFSET = 1,
  MAX_SIZE = 0b1111111111111111,
  SIZE_MASK = 0b00000000000000001111111111111111,
  SCOPE_MASK = 0b00111111111111110000000000000000,
  STATE_MASK = 0b11000000000000000000000000000000,
}

function encodeTableInfo(size: number, scopeSize: number, state: number) {
  return size | (scopeSize << 16) | (state << 30);
}

function changeState(info: number, newState: number) {
  return info | (newState << 30);
}

export type Placeholder = [number, () => number];
export type StdlibPlaceholder = [number, StdlibOperand];

const PAGE_SIZE = 0x100000;

export class RuntimeHeapImpl implements RuntimeHeap {
  private heap: Uint16Array;
  private table: number[];

  constructor(serializedHeap: SerializedHeap) {
    let { buffer, table } = serializedHeap;
    this.heap = new Uint16Array(buffer);
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
    if (DEBUG) {
      let info = this.table[handle + Size.INFO_OFFSET];
      return info & Size.SIZE_MASK;
    }
    return -1;
  }

  scopesizeof(handle: number): number {
    let info = this.table[handle + Size.INFO_OFFSET];
    return (info & Size.SCOPE_MASK) >> 16;
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
export class HeapImpl implements CompileTimeHeap, RuntimeHeap {
  private heap: Uint16Array;
  private placeholders: Placeholder[] = [];
  private stdlibs: StdlibPlaceholder[] = [];
  private table: number[];
  private offset = 0;
  private handle = 0;
  private capacity = PAGE_SIZE;

  constructor() {
    this.heap = new Uint16Array(PAGE_SIZE);
    this.table = [];
  }

  push(item: number): void {
    this.sizeCheck();
    this.heap[this.offset++] = item;
  }

  private sizeCheck() {
    if (this.capacity === 0) {
      let heap = slice(this.heap, 0, this.offset);
      this.heap = new Uint16Array(heap.length + PAGE_SIZE);
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
    this.table.push(this.offset, 0);
    let handle = this.handle;
    this.handle += Size.ENTRY_SIZE;
    return handle;
  }

  finishMalloc(handle: number, scopeSize: number): void {
    let start = this.table[handle];
    let finish = this.offset;
    let instructionSize = finish - start;
    let info = encodeTableInfo(instructionSize, scopeSize, TableSlotState.Allocated);
    this.table[handle + Size.INFO_OFFSET] = info;
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
    this.table.push(address, encodeTableInfo(0, 0, TableSlotState.Pointer));
    let handle = this.handle;
    this.handle += Size.ENTRY_SIZE;
    return handle;
  }

  sizeof(handle: number): number {
    if (DEBUG) {
      let info = this.table[handle + Size.INFO_OFFSET];
      return info & Size.SIZE_MASK;
    }
    return -1;
  }

  scopesizeof(handle: number): number {
    let info = this.table[handle + Size.INFO_OFFSET];
    return (info & Size.SCOPE_MASK) >> 16;
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

function slice(arr: Uint16Array, start: number, end: number): Uint16Array {
  if (arr.slice !== undefined) {
    return arr.slice(start, end);
  }

  let ret = new Uint16Array(end);

  for (; start < end; start++) {
    ret[start] = arr[start];
  }

  return ret;
}
