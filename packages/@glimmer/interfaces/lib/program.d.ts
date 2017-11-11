import { Opaque, Unique } from './core';
import { SymbolTable } from './tier1/symbol-table';

export interface Opcode {
  offset: number;
  type: number;
  op1: number;
  op2: number;
  op3: number;
  size: number;
}

export type VMHandle = Unique<"Handle">;

export interface CompileTimeHeap {
  push(name: /* TODO: Op */ number, op1?: number, op2?: number, op3?: number): void;
  pushPlaceholder(valueFunc: () => number): void;
  malloc(): VMHandle;
  finishMalloc(handle: VMHandle, scopeSize: number): void;

  // for debugging
  getaddr(handle: VMHandle): number;
  sizeof(handle: VMHandle): number;
}

export interface CompileTimeProgram {
  [key: number]: never;

  constants: CompileTimeConstants;
  heap: CompileTimeHeap;

  opcode(offset: number): Opcode;
}

export interface CompileTimeConstants {
  string(value: string): number;
  stringArray(strings: string[]): number;
  array(values: number[]): number;
  table(t: SymbolTable): number;
  handle(locator: Opaque): number;
  serializable(value: Opaque): number;
  float(value: number): number;
  negative(value: number): number;
}

export interface CompileTimeLazyConstants extends CompileTimeConstants {
  other(value: Opaque): number;
}
