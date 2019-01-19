import { DEBUG } from '@glimmer/local-debug-flags';
import { Opaque } from '@glimmer/interfaces';
import { PrimitiveType } from '@glimmer/program';
import { unreachable } from '@glimmer/util';
import { Stack as WasmStack } from '@glimmer/low-level';

const MAX_SMI = 0xfffffff;

export class InnerStack {
  constructor(private inner = new WasmStack(), private js: Opaque[] = []) {}

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

  write(pos: number, value: Opaque): void {
    if (isImmediate(value)) {
      this.inner.writeRaw(pos, encodeImmediate(value));
    } else {
      let idx = this.js.length;
      this.js.push(value);
      this.inner.writeRaw(pos, ~idx);
    }
  }

  writeRaw(pos: number, value: number): void {
    this.inner.writeRaw(pos, value);
  }

  get<T>(pos: number): T {
    let value = this.inner.getRaw(pos);

    if (value < 0) {
      return this.js[~value] as T;
    } else {
      return decodeImmediate(value) as any;
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

export default class EvaluationStack {
  static empty(): EvaluationStack {
    return new this(new InnerStack(), 0, -1);
  }

  static restore(snapshot: Opaque[]): EvaluationStack {
    let stack = new InnerStack();

    for (let i = 0; i < snapshot.length; i++) {
      stack.write(i, snapshot[i]);
    }

    return new this(stack, 0, snapshot.length - 1);
  }

  constructor(private stack: InnerStack, public fp: number, public sp: number) {
    if (DEBUG) {
      Object.seal(this);
    }
  }

  push(value: Opaque): void {
    this.stack.write(++this.sp, value);
  }

  pushEncodedImmediate(value: number): void {
    this.stack.writeRaw(++this.sp, value);
  }

  pushNull(): void {
    this.stack.write(++this.sp, null);
  }

  dup(position = this.sp): void {
    this.stack.copy(position, ++this.sp);
  }

  copy(from: number, to: number): void {
    this.stack.copy(from, to);
  }

  pop<T>(n = 1): T {
    let top = this.stack.get<T>(this.sp);
    this.sp -= n;
    return top;
  }

  popSmi(): number {
    return this.stack.get(this.sp--);
  }

  peek<T>(offset = 0): T {
    return this.stack.get<T>(this.sp - offset);
  }

  get<T>(offset: number, base = this.fp): T {
    return this.stack.get<T>(base + offset);
  }

  set(value: Opaque, offset: number, base = this.fp) {
    this.stack.write(base + offset, value);
  }

  slice(start: number, end: number): InnerStack {
    return this.stack.slice(start, end);
  }

  sliceArray<T = Opaque>(start: number, end: number): T[] {
    return this.stack.sliceInner(start, end);
  }

  capture(items: number): Opaque[] {
    let end = this.sp + 1;
    let start = end - items;
    return this.stack.sliceInner(start, end);
  }

  reset() {
    this.stack.reset();
  }

  toArray() {
    return this.stack.sliceInner(this.fp, this.sp + 1);
  }
}

function isImmediate(value: Opaque): value is number | boolean | null | undefined {
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

      if (abs > MAX_SMI) return false;

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
    let abs = Math.abs(primitive);
    if (abs > MAX_SMI) throw new Error('not smi');
    return (Math.abs(primitive) << 3) | PrimitiveType.NEGATIVE;
  } else {
    if (primitive > MAX_SMI) throw new Error('not smi');
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
