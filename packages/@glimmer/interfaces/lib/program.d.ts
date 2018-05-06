import { Opaque, Unique } from './core';

export interface Opcode {
  offset: number;
  type: number;
  op1: number;
  op2: number;
  op3: number;
  size: number;
  isMachine: number;
}

export type VMHandle = Unique<'Handle'>;

export interface CompileTimeHeap {
  push(name: /* TODO: Op */ number, op1?: number, op2?: number, op3?: number): void;
  pushPlaceholder(valueFunc: () => number): void;
  malloc(): number;
  finishMalloc(handle: number, scopeSize: number): void;

  // for debugging
  getaddr(handle: number): number;
  sizeof(handle: number): number;
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
  handle(locator: Opaque): number;
  serializable(value: Opaque): number;
  number(value: number): number;
}

export interface CompileTimeLazyConstants extends CompileTimeConstants {
  other(value: Opaque): number;
}
