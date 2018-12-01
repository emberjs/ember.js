import { Opaque, Unique } from './core';
import { Op } from '@glimmer/vm';

export interface Opcode {
  offset: number;
  type: number;
  op1: number;
  op2: number;
  op3: number;
  size: number;
  isMachine: 0 | 1;
}

export type VMHandle = Unique<'Handle'>;

export interface CompileTimeHeap {
  push(name: Op, op1?: number, op2?: number, op3?: number): void;
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

export interface CompileTimeConstants<Locator = unknown> {
  string(value: string): number;
  stringArray(strings: string[]): number;
  array(values: number[]): number;
  handle(locator: Locator): number;
  serializable(value: Opaque): number;
  number(value: number): number;
}

export interface CompileTimeLazyConstants extends CompileTimeConstants {
  other(value: Opaque): number;
}
