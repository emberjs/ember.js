import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { assert } from '@glimmer/util';
import { $fp, $pc, $sp } from '@glimmer/vm';

import type { LowLevelRegisters } from './low-level';

import { initializeRegistersWithSP } from './low-level';

export interface EvaluationStack {
  $sp: number;

  push(value: unknown): void;
  dup(position?: number): void;
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
  static restore(snapshot: unknown[], pc: number): EvaluationStackImpl {
    const stack = new this(snapshot.slice(), initializeRegistersWithSP(snapshot.length - 1));

    assert(typeof pc === 'number', 'pc is a number');

    stack.registers[$pc] = pc;
    stack.registers[$sp] = snapshot.length - 1;
    stack.registers[$fp] = -1;

    return stack;
  }

  readonly #registers: LowLevelRegisters;

  // fp -> sp
  constructor(
    private stack: unknown[] = [],
    registers: LowLevelRegisters
  ) {
    this.#registers = registers;

    if (LOCAL_DEBUG) {
      Object.seal(this);
    }
  }

  get registers(): LowLevelRegisters {
    return this.#registers;
  }

  get $sp(): number {
    return this.#registers[$sp];
  }

  set $sp(sp: number) {
    this.#registers[$sp] = sp;
  }

  push(value: unknown): void {
    this.stack[++this.$sp] = value;
  }

  dup(position = this.$sp): void {
    this.stack[++this.$sp] = this.stack[position];
  }

  copy(from: number, to: number): void {
    this.stack[to] = this.stack[from];
  }

  pop<T>(n = 1): T {
    let top = this.stack[this.$sp] as T;
    this.$sp -= n;
    return top;
  }

  peek<T>(offset = 0): T {
    return this.stack[this.$sp - offset] as T;
  }

  get<T>(offset: number, base = this.#registers[$fp]): T {
    return this.stack[base + offset] as T;
  }

  set(value: unknown, offset: number, base = this.#registers[$fp]) {
    this.stack[base + offset] = value;
  }

  slice<T = unknown>(start: number, end: number): T[] {
    return this.stack.slice(start, end) as T[];
  }

  capture(items: number): unknown[] {
    let end = this.$sp + 1;
    let start = end - items;
    return this.stack.slice(start, end);
  }

  reset() {
    this.stack.length = 0;
  }

  toArray() {
    return this.stack.slice(this.#registers[$fp], this.#registers[$sp] + 1);
  }
}
