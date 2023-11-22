import type { MachineRegister } from '@glimmer/vm';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { $fp, $sp } from '@glimmer/vm';

import type { LowLevelRegisters } from './low-level';

import { REGISTERS } from '../symbols';
import { initializeRegistersWithSP } from './low-level';

export interface EvaluationStack {
  [REGISTERS]: LowLevelRegisters;

  push(value: unknown): void;
  dup(position?: MachineRegister): void;
  copy(from: number, to: number): void;
  pop<T>(n?: number): T;
  peek<T>(offset?: number): T;
  get<T>(offset: number, base?: number): T;
  set(value: unknown, offset: number, base?: number): void;
  slice<T = unknown>(start: number, end: number): T[];
  capture(items: number): unknown[];
  reset(): void;
  toArray(): unknown[];
}

export default class EvaluationStackImpl implements EvaluationStack {
  static restore(snapshot: unknown[]): EvaluationStackImpl {
    return new this(snapshot.slice(), initializeRegistersWithSP(snapshot.length - 1));
  }

  readonly [REGISTERS]: LowLevelRegisters;

  // fp -> sp
  constructor(
    private stack: unknown[] = [],
    registers: LowLevelRegisters
  ) {
    this[REGISTERS] = registers;

    if (LOCAL_DEBUG) {
      Object.seal(this);
    }
  }

  push(value: unknown): void {
    this.stack[++this[REGISTERS][$sp]] = value;
  }

  dup(position = this[REGISTERS][$sp]): void {
    this.stack[++this[REGISTERS][$sp]] = this.stack[position];
  }

  copy(from: number, to: number): void {
    this.stack[to] = this.stack[from];
  }

  pop<T>(n = 1): T {
    let top = this.stack[this[REGISTERS][$sp]] as T;
    this[REGISTERS][$sp] -= n;
    return top;
  }

  peek<T>(offset = 0): T {
    return this.stack[this[REGISTERS][$sp] - offset] as T;
  }

  get<T>(offset: number, base = this[REGISTERS][$fp]): T {
    return this.stack[base + offset] as T;
  }

  set(value: unknown, offset: number, base = this[REGISTERS][$fp]) {
    this.stack[base + offset] = value;
  }

  slice<T = unknown>(start: number, end: number): T[] {
    return this.stack.slice(start, end) as T[];
  }

  capture(items: number): unknown[] {
    let end = this[REGISTERS][$sp] + 1;
    let start = end - items;
    return this.stack.slice(start, end);
  }

  reset() {
    this.stack.length = 0;
  }

  toArray() {
    return this.stack.slice(this[REGISTERS][$fp], this[REGISTERS][$sp] + 1);
  }
}
