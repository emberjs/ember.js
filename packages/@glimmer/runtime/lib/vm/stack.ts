import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import {
  decodeImmediate,
  isSmallInt,
  encodeImmediate,
  encodeHandle,
  decodeHandle,
  isHandle,
} from '@glimmer/util';
import { Stack as WasmStack } from '@glimmer/low-level';
import { MachineRegister, $sp, $fp } from '@glimmer/vm';
import { LowLevelRegisters, initializeRegistersWithSP } from './low-level';
import { REGISTERS } from '../symbols';

export class InnerStack {
  constructor(private inner = new WasmStack(), private js: unknown[] = []) {}

  slice(start?: number, end?: number): InnerStack {
    let inner: WasmStack;

    if (typeof start === 'number' && typeof end === 'number') {
      inner = this.inner.slice(start, end);
    } else if (typeof start === 'number' && end === undefined) {
      inner = this.inner.sliceFrom(start);
    } else {
      inner = this.inner.clone();
    }

    return new InnerStack(inner, this.js.slice(start, end));
  }

  sliceInner<T = unknown>(start: number, end: number): T[] {
    let out: T[] = [];

    if (start === -1) {
      return out;
    }

    for (let i = start; i < end; i++) {
      out.push(this.get(i));
    }

    return out;
  }

  copy(from: number, to: number): void {
    this.inner.copy(from, to);
  }

  write(pos: number, value: unknown): void {
    switch (typeof value) {
      case 'boolean':
      case 'undefined':
        this.writeRaw(pos, encodeImmediate(value));
        break;
      case 'number':
        if (isSmallInt(value)) {
          this.writeRaw(pos, encodeImmediate(value));
          break;
        }
      case 'object':
        if (value === null) {
          this.writeRaw(pos, encodeImmediate(value));
          break;
        }
      default:
        this.writeJs(pos, value);
    }
  }

  writeJs(pos: number, value: unknown): void {
    let idx = this.js.length;
    this.js.push(value);
    this.inner.writeRaw(pos, encodeHandle(idx));
  }

  writeRaw(pos: number, value: number) {
    this.inner.writeRaw(pos, value);
  }

  get<T>(pos: number): T {
    let value = this.inner.getRaw(pos);
    if (isHandle(value)) {
      return this.js[decodeHandle(value)] as T;
    } else {
      return (decodeImmediate(value) as unknown) as T;
    }
  }

  reset(): void {
    this.inner.reset();
    this.js.length = 0;
  }

  get length(): number {
    return this.inner.len();
  }
}

export interface EvaluationStack {
  [REGISTERS]: LowLevelRegisters;

  push(value: unknown): void;
  pushJs(value: unknown): void;
  pushRaw(value: number): void;
  dup(position?: MachineRegister): void;
  copy(from: number, to: number): void;
  pop<T>(n?: number): T;
  peek<T>(offset?: number): T;
  get<T>(offset: number, base?: number): T;
  set(value: unknown, offset: number, base?: number): void;
  slice(start: number, end: number): InnerStack;
  sliceArray<T = unknown>(start: number, end: number): T[];
  capture(items: number): unknown[];
  reset(): void;
  toArray(): unknown[];
}

export default class EvaluationStackImpl implements EvaluationStack {
  static restore(snapshot: unknown[]): EvaluationStack {
    let stack = new InnerStack();

    for (let i = 0; i < snapshot.length; i++) {
      stack.write(i, snapshot[i]);
    }

    return new this(stack, initializeRegistersWithSP(snapshot.length - 1));
  }

  readonly [REGISTERS]: LowLevelRegisters;

  // fp -> sp
  constructor(private stack: InnerStack, registers: LowLevelRegisters) {
    this[REGISTERS] = registers;

    if (LOCAL_DEBUG) {
      Object.seal(this);
    }
  }

  push(value: unknown): void {
    this.stack.write(++this[REGISTERS][$sp], value);
  }

  pushJs(value: unknown): void {
    this.stack.writeJs(++this[REGISTERS][$sp], value);
  }

  pushRaw(value: number): void {
    this.stack.writeRaw(++this[REGISTERS][$sp], value);
  }

  dup(position = this[REGISTERS][$sp]): void {
    this.stack.copy(position, ++this[REGISTERS][$sp]);
  }

  copy(from: number, to: number): void {
    this.stack.copy(from, to);
  }

  pop<T>(n = 1): T {
    let top = this.stack.get<T>(this[REGISTERS][$sp]);
    this[REGISTERS][$sp] -= n;
    return top;
  }

  peek<T>(offset = 0): T {
    return this.stack.get<T>(this[REGISTERS][$sp] - offset);
  }

  get<T>(offset: number, base = this[REGISTERS][$fp]): T {
    return this.stack.get<T>(base + offset);
  }

  set(value: unknown, offset: number, base = this[REGISTERS][$fp]) {
    this.stack.write(base + offset, value);
  }

  slice(start: number, end: number): InnerStack {
    return this.stack.slice(start, end);
  }

  sliceArray<T = unknown>(start: number, end: number): T[] {
    return this.stack.sliceInner(start, end);
  }

  capture(items: number): unknown[] {
    let end = this[REGISTERS][$sp] + 1;
    let start = end - items;
    return this.stack.sliceInner(start, end);
  }

  reset() {
    this.stack.reset();
  }

  toArray() {
    console.log(this[REGISTERS]);
    return this.stack.sliceInner(this[REGISTERS][$fp], this[REGISTERS][$sp] + 1);
  }
}
