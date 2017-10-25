import { DEBUG } from '@glimmer/local-debug-flags';
import { Opaque } from '@glimmer/interfaces';
import { PrimitiveType } from '@glimmer/program';
import { unreachable } from '@glimmer/util';

const HI   = 0x80000000;
const MASK = 0x7FFFFFFF;

export class InnerStack {
  [index: number]: never;

  constructor(private inner: number[] = [], private js: Opaque[] = []) {}

  slice(start?: number, end?: number): InnerStack {
    return new InnerStack(this.inner.slice(start, end), this.js.slice(start, end));
  }

  sliceInner<T = Opaque>(start: number, end: number): T[] {
    let out = [];

    for (let i=start; i<end; i++) {
      out.push(this.get(i));
    }

    return out;
  }

  copy(from: number, to: number): void {
    this.inner[to] = this.inner[from];
  }

  update(pos: number, value: Opaque): void {
    if (isImmediate(value)) {
      this.inner[pos] = encodeImmediate(value);
    } else {
      let idx = this.js.length;
      this.js.push(value);
      this.inner[pos] = idx | HI;
    }
  }

  get<T>(pos: number): T {
    let value = this.inner[pos];

    if (value & HI) {
      return this.js[value & MASK] as T;
    } else {
      return decodeImmediate(value) as any;
    }
  }

  reset(): void {
    this.inner.length = 0;
  }

  get length(): number {
    return this.inner.length;
  }
}

export default class EvaluationStack {
  static empty(): EvaluationStack {
    return new this(new InnerStack(), 0, -1);
  }

  static restore(snapshot: Opaque[]): EvaluationStack {
    let stack = new InnerStack();

    for (let i=0; i<snapshot.length; i++) {
      stack.update(i, snapshot[i]);
    }

    return new this(stack, 0, snapshot.length - 1);
  }

  constructor(private stack: InnerStack, public fp: number, public sp: number) {
    if (DEBUG) {
      Object.seal(this);
    }
  }

  push(value: Opaque): void {
    this.stack.update(++this.sp, value);
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

  peek<T>(offset = 0): T {
    return this.stack.get<T>(this.sp - offset);
  }

  get<T>(offset: number, base = this.fp): T {
    return this.stack.get<T>(base + offset);
  }

  set(value: Opaque, offset: number, base = this.fp) {
    this.stack.update(base + offset, value);
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
      return (value as number) % 1 === 0 && value > -1 && !((value as number) & HI);
    default:
      return false;
  }
}

function encodeImmediate(primitive: number | boolean | null | undefined): number {
  switch (typeof primitive) {
    case 'number':
      return (primitive as number) << 3 | PrimitiveType.NUMBER;
    case 'boolean':
      return ((primitive as any) | 0) << 3 | PrimitiveType.BOOLEAN_OR_VOID;
    case 'object':
      // assume null
      return 2 << 3 | PrimitiveType.BOOLEAN_OR_VOID;
    case 'undefined':
      return 3 << 3 | PrimitiveType.BOOLEAN_OR_VOID;
    default:
      throw unreachable();
  }
}

function decodeImmediate(immediate: number): number | boolean | null | undefined {
  let flag = immediate & 7; // 111
  let value = immediate >> 3;

  switch (flag) {
    case PrimitiveType.NUMBER:
      return value;
    case PrimitiveType.BOOLEAN_OR_VOID:
      switch (value) {
        case 0: return false;
        case 1: return true;
        case 2: return null;
        case 3: return undefined;
      }
    default:
      throw unreachable();
  }
}
