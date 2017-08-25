
import { Recast } from "@glimmer/interfaces";
import { DEBUG } from "@glimmer/local-debug-flags";
import { Constants, WriteOnlyConstants, RuntimeConstants } from './constants';
import { Opcode } from './opcode';
import { VMHandle, CompileTimeProgram } from "@glimmer/opcode-compiler";

enum TableSlotState {
  Allocated,
  Freed,
  Purged,
  Pointer
}

const ENTRY_SIZE = 4;
const SIZE_OFFSET = 1;
const SCOPESIZE_OFFSET = 2;
const STATE_OFFSET = 3;

export class Heap {
  private heap: number[] = [];
  private offset = 0;
  private handle = 0;

  /**
   * layout:
   *
   * - pointer into heap
   * - size
   * - scope size
   * - freed (0 or 1)
   */
  private table: number[] = [];

  push(item: number): void {
    this.heap[this.offset++] = item;
  }

  getbyaddr(address: number): number {
    return this.heap[address];
  }

  setbyaddr(address: number, value: number) {
    this.heap[address] = value;
  }

  reserve(): VMHandle {
    this.table.push(0, 0, 0, 0);
    let handle = this.handle;
    this.handle += ENTRY_SIZE;
    return handle as Recast<number, VMHandle>;
  }

  malloc(): VMHandle {
    this.table.push(this.offset, 0, 0, 0);
    let handle = this.handle;
    this.handle += ENTRY_SIZE;
    return handle as Recast<number, VMHandle>;
  }

  finishMalloc(handle: VMHandle, scopeSize: number): void {
    let start = this.table[handle as Recast<VMHandle, number>];
    let finish = this.offset;
    this.table[(handle as Recast<VMHandle, number>) + SIZE_OFFSET] = finish - start;
    this.table[(handle as Recast<VMHandle, number>) + SCOPESIZE_OFFSET] = scopeSize;
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
    this.table.push(address, 0, 0, TableSlotState.Pointer);
    let handle = this.handle;
    this.handle += ENTRY_SIZE;
    return handle as Recast<number, VMHandle>;
  }

  sizeof(handle: VMHandle): number {
    if (DEBUG) {
      return this.table[(handle as Recast<VMHandle, number>) + SIZE_OFFSET];
    }
    return -1;
  }

  scopesizeof(handle: VMHandle): number {
    return this.table[(handle as Recast<VMHandle, number>) + SCOPESIZE_OFFSET];
  }

  free(handle: VMHandle): void {
    this.table[(handle as Recast<VMHandle, number>) + STATE_OFFSET] = 1;
  }

  compact(): void {
    let compactedSize = 0;
    let { table, table: { length }, heap } = this;

    for (let i=0; i<length; i+=ENTRY_SIZE) {
      let offset = table[i];
      let size = table[i + SIZE_OFFSET];
      let state = table[i + STATE_OFFSET];

      if (state === TableSlotState.Purged) {
        continue;
      } else if (state === TableSlotState.Freed) {
        // transition to "already freed" aka "purged"
        // a good improvement would be to reuse
        // these slots
        table[i + STATE_OFFSET] = TableSlotState.Purged;
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
