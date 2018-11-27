import { DEBUG } from '@glimmer/local-debug-flags';
import { Opaque } from '@glimmer/interfaces';
import { PrimitiveType } from '@glimmer/program';
import { unreachable } from '@glimmer/util';
import { Stack as WasmStack } from '@glimmer/low-level';
import { MachineRegister, $sp, $fp } from '@glimmer/vm';
import { LowLevelRegisters, initializeRegistersWithSP } from './low-level';
import { REGISTERS } from '../symbols';

const HI = 0x80000000;
const MASK = 0x7fffffff;

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

  sliceInner<T = Opaque>(start: number, end: number): T[] {
    let out = [];

    for (let i = start; i < end; i++) {
      out.push(this.get(i));
    }

    return out;
  }

  copy(from: number, to: number): void {
    this.inner.copy(from, to);
  }

  write(pos: number, value: unknown): void {
    if (isImmediate(value)) {
      this.inner.writeRaw(pos, encodeImmediate(value));
    } else {
      let idx = this.js.length;
      this.js.push(value);
      this.inner.writeRaw(pos, idx | HI);
    }
  }

  writeSmi(pos: number, value: number): void {
    this.inner.writeSmi(pos, value);
  }

  writeImmediate(pos: number, value: number): void {
    this.inner.writeRaw(pos, value);
  }

  get<T>(pos: number): T {
    let value = this.inner.getRaw(pos);

    if (value & HI) {
      return this.js[value & MASK] as T;
    } else {
      return decodeImmediate(value) as any;
    }
  }

  getSmi(pos: number): number {
    return this.inner.getSmi(pos);
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

  push(value: Opaque): void;
  pushSmi(value: number): void;
  pushImmediate(value: null | undefined | number | boolean): void;
  pushEncodedImmediate(value: number): void;
  pushNull(): void;
  dup(position?: MachineRegister): void;
  copy(from: number, to: number): void;
  pop<T>(n?: number): T;
  popSmi(): number;
  peek<T>(offset?: number): T;
  peekSmi(offset?: number): number;
  get<T>(offset: number, base?: number): T;
  getSmi(offset: number, base?: number): number;
  set(value: Opaque, offset: number, base?: number): void;
  slice(start: number, end: number): InnerStack;
  sliceArray<T = Opaque>(start: number, end: number): T[];
  capture(items: number): Opaque[];
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

    if (DEBUG) {
      Object.seal(this);
    }
  }

  push(value: Opaque): void {
    this.stack.write(++this[REGISTERS][$sp], value);
  }

  pushSmi(value: number): void {
    this.stack.writeSmi(++this[REGISTERS][$sp], value);
  }

  pushImmediate(value: null | undefined | number | boolean): void {
    this.stack.writeImmediate(++this[REGISTERS][$sp], encodeImmediate(value));
  }

  pushEncodedImmediate(value: number): void {
    this.stack.writeImmediate(++this[REGISTERS][$sp], value);
  }

  pushNull(): void {
    this.stack.writeImmediate(++this[REGISTERS][$sp], Immediates.Null);
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

  popSmi(): number {
    return this.stack.getSmi(this[REGISTERS][$sp]--);
  }

  peek<T>(offset = 0): T {
    return this.stack.get<T>(this[REGISTERS][$sp] - offset);
  }

  peekSmi(offset = 0): number {
    return this.stack.getSmi(this[REGISTERS][$sp] - offset);
  }

  get<T>(offset: number, base = this[REGISTERS][$fp]): T {
    return this.stack.get<T>(base + offset);
  }

  getSmi(offset: number, base = this[REGISTERS][$fp]): number {
    return this.stack.getSmi(base + offset);
  }

  set(value: Opaque, offset: number, base = this[REGISTERS][$fp]) {
    this.stack.write(base + offset, value);
  }

  slice(start: number, end: number): InnerStack {
    return this.stack.slice(start, end);
  }

  sliceArray<T = Opaque>(start: number, end: number): T[] {
    return this.stack.sliceInner(start, end);
  }

  capture(items: number): Opaque[] {
    let end = this[REGISTERS][$sp] + 1;
    let start = end - items;
    return this.stack.sliceInner(start, end);
  }

  reset() {
    this.stack.reset();
  }

  toArray() {
    return this.stack.sliceInner(this[REGISTERS][$fp], this[REGISTERS][$sp] + 1);
  }
}

function isImmediate(value: unknown): value is number | boolean | null | undefined {
  let type = typeof value;

  if (value === null || value === undefined) return true;

  switch (type) {
    case 'boolean':
    case 'undefined':
      return true;
    case 'number':
      // not an integer
      if ((value as number) % 1 !== 0) return false;

      let abs = Math.abs(value as number);

      // too big
      if (abs > HI) return false;

      return true;
    default:
      return false;
  }
}

export const enum Type {
  NUMBER = 0b000,
  FLOAT = 0b001,
  STRING = 0b010,
  BOOLEAN_OR_VOID = 0b011,
  NEGATIVE = 0b100,
}

export const enum Immediates {
  False = (0 << 3) | Type.BOOLEAN_OR_VOID,
  True = (1 << 3) | Type.BOOLEAN_OR_VOID,
  Null = (2 << 3) | Type.BOOLEAN_OR_VOID,
  Undef = (3 << 3) | Type.BOOLEAN_OR_VOID,
}

function encodeSmi(primitive: number) {
  if (primitive < 0) {
    return (Math.abs(primitive) << 3) | PrimitiveType.NEGATIVE;
  } else {
    return (primitive << 3) | PrimitiveType.NUMBER;
  }
}

function encodeImmediate(primitive: number | boolean | null | undefined): number {
  switch (typeof primitive) {
    case 'number':
      return encodeSmi(primitive as number);
    case 'boolean':
      return primitive ? Immediates.True : Immediates.False;
    case 'object':
      // assume null
      return Immediates.Null;
    case 'undefined':
      return Immediates.Undef;
    default:
      throw unreachable();
  }
}

function decodeSmi(smi: number): number {
  switch (smi & 0b111) {
    case PrimitiveType.NUMBER:
      return smi >> 3;
    case PrimitiveType.NEGATIVE:
      return -(smi >> 3);
    default:
      throw unreachable();
  }
}

function decodeImmediate(immediate: number): number | boolean | null | undefined {
  switch (immediate) {
    case Immediates.False:
      return false;
    case Immediates.True:
      return true;
    case Immediates.Null:
      return null;
    case Immediates.Undef:
      return undefined;
    default:
      return decodeSmi(immediate);
  }
}
