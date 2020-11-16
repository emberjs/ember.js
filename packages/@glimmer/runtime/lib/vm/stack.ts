import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { Stack as WasmStack } from '@glimmer/low-level';
import {
  assert,
  constants,
  decodeHandle,
  decodeImmediate,
  encodeHandle,
  encodeImmediate,
  ImmediateConstants,
  isHandle,
  isSmallInt,
} from '@glimmer/util';
import { $fp, $sp, MachineRegister } from '@glimmer/vm';
import { REGISTERS } from '../symbols';
import { initializeRegistersWithSP, LowLevelRegisters } from './low-level';

export class InnerStack {
  private js: unknown[] = constants();

  constructor(private inner = new WasmStack(), js?: unknown[]) {
    if (js !== undefined) {
      this.js = this.js.concat(js);
    }
  }

  slice<T = unknown>(start: number, end: number): T[] {
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

  writeJs(pos: number, value: unknown): void {
    let idx = this.js.length;
    this.js.push(value);
    this.inner.writeRaw(pos, encodeHandle(idx));
  }

  writeSmallInt(pos: number, value: number): void {
    assert(isSmallInt(value), `cannot push number, is not an SMI: ${value}`);

    this.inner.writeRaw(pos, encodeImmediate(value));
  }

  writeTrue(pos: number): void {
    this.inner.writeRaw(pos, ImmediateConstants.ENCODED_TRUE_HANDLE);
  }

  writeFalse(pos: number): void {
    this.inner.writeRaw(pos, ImmediateConstants.ENCODED_FALSE_HANDLE);
  }

  writeNull(pos: number): void {
    this.inner.writeRaw(pos, ImmediateConstants.ENCODED_NULL_HANDLE);
  }

  writeUndefined(pos: number): void {
    this.inner.writeRaw(pos, ImmediateConstants.ENCODED_UNDEFINED_HANDLE);
  }

  writeRaw(pos: number, value: number) {
    this.inner.writeRaw(pos, value);
  }

  getJs<T>(pos: number): T {
    let value = this.inner.getRaw(pos);

    assert(isHandle(value), 'attempted to getJs, but value was an immediate');

    return this.js[decodeHandle(value)] as T;
  }

  getSmallInt(pos: number): number {
    let value = this.inner.getRaw(pos);

    assert(!isHandle(value), 'attempted to getSmallInt, but value was a handle');

    return decodeImmediate(value);
  }

  get<T>(pos: number): T {
    let value = this.inner.getRaw(pos) | 0;

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

  pushJs(value: unknown): void;
  pushSmallInt(value: number): void;
  pushTrue(): void;
  pushFalse(): void;
  pushNull(): void;
  pushUndefined(): void;
  pushRaw(value: number): void;
  dup(position?: MachineRegister): void;
  copy(from: number, to: number): void;
  pop<T>(n?: number): T;
  popJs<T>(n?: number): T;
  popSmallInt(n?: number): number;
  peek<T>(offset?: number): T;
  peekJs<T>(offset?: number): T;
  peekSmallInt(offset?: number): number;
  get<T>(offset: number, base?: number): T;
  set(value: unknown, offset: number, base?: number): void;
  slice<T = unknown>(start: number, end: number): T[];
  capture(items: number): unknown[];
  reset(): void;
  toArray(): unknown[];
}

export default class EvaluationStackImpl implements EvaluationStack {
  static restore(snapshot: unknown[]): EvaluationStackImpl {
    let stack = new InnerStack();

    for (let i = 0; i < snapshot.length; i++) {
      let value = snapshot[i];

      if (typeof value === 'number' && isSmallInt(value)) {
        stack.writeRaw(i, encodeImmediate(value));
      } else if (value === true) {
        stack.writeTrue(i);
      } else if (value === false) {
        stack.writeFalse(i);
      } else if (value === null) {
        stack.writeNull(i);
      } else if (value === undefined) {
        stack.writeUndefined(i);
      } else {
        stack.writeJs(i, value);
      }
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

  pushJs(value: unknown): void {
    this.stack.writeJs(++this[REGISTERS][$sp], value);
  }

  pushSmallInt(value: number): void {
    this.stack.writeSmallInt(++this[REGISTERS][$sp], value);
  }

  pushTrue(): void {
    this.stack.writeTrue(++this[REGISTERS][$sp]);
  }

  pushFalse(): void {
    this.stack.writeFalse(++this[REGISTERS][$sp]);
  }

  pushNull(): void {
    this.stack.writeNull(++this[REGISTERS][$sp]);
  }

  pushUndefined(): void {
    this.stack.writeUndefined(++this[REGISTERS][$sp]);
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

  popJs<T>(n = 1): T {
    let top = this.stack.getJs<T>(this[REGISTERS][$sp]);
    this[REGISTERS][$sp] -= n;
    return top;
  }

  popSmallInt(n = 1): number {
    let top = this.stack.getSmallInt(this[REGISTERS][$sp]);
    this[REGISTERS][$sp] -= n;
    return top;
  }

  pop<T>(n = 1): T {
    let top = this.stack.get<T>(this[REGISTERS][$sp]);
    this[REGISTERS][$sp] -= n;
    return top;
  }

  peekJs<T>(offset = 0): T {
    return this.stack.getJs<T>(this[REGISTERS][$sp] - offset);
  }

  peekSmallInt(offset = 0): number {
    return this.stack.getSmallInt(this[REGISTERS][$sp] - offset);
  }

  peek<T>(offset = 0): T {
    return this.stack.get<T>(this[REGISTERS][$sp] - offset);
  }

  get<T>(offset: number, base = this[REGISTERS][$fp]): T {
    return this.stack.get<T>(base + offset);
  }

  set(value: unknown, offset: number, base = this[REGISTERS][$fp]) {
    this.stack.writeJs(base + offset, value);
  }

  slice<T = unknown>(start: number, end: number): T[] {
    return this.stack.slice(start, end);
  }

  capture(items: number): unknown[] {
    let end = this[REGISTERS][$sp] + 1;
    let start = end - items;
    return this.stack.slice(start, end);
  }

  reset() {
    this.stack.reset();
  }

  toArray() {
    return this.stack.slice(this[REGISTERS][$fp], this[REGISTERS][$sp] + 1);
  }
}
