import { DEBUG } from '@glimmer/local-debug-flags';
import { Opaque } from '@glimmer/interfaces';

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
    if (typeof value === 'number' && !((value as number) & HI)) {
      this.inner[pos] = value;
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
      return value as any;
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
