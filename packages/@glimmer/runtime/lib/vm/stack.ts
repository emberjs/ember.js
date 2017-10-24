import { DEBUG } from '@glimmer/local-debug-flags';
import { Opaque } from '@glimmer/interfaces';

export class CapturedStack {
  [index: number]: never;

  constructor(private inner: Opaque[] = []) {}

  slice(start?: number, end?: number): CapturedStack {
    return new CapturedStack(this.inner.slice(start, end));
  }

  sliceInner<T = Opaque>(start: number, end: number): T[] {
    return this.inner.slice(start, end) as T[];
  }

  update(pos: number, value: Opaque): void {
    this.inner[pos] = value;
  }

  get<T>(pos: number): T {
    return this.inner[pos] as T;
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
    return new this(new CapturedStack(), 0, -1);
  }

  static restore(snapshot: CapturedStack): EvaluationStack {
    return new this(snapshot.slice(), 0, snapshot.length - 1);
  }

  constructor(private stack: CapturedStack, public fp: number, public sp: number) {
    if (DEBUG) {
      Object.seal(this);
    }
  }

  push(value: Opaque): void {
    this.stack.update(++this.sp, value);
  }

  dup(position = this.sp): void {
    this.push(this.stack.get(position));
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

  slice(start: number, end: number): CapturedStack {
    return this.stack.slice(start, end);
  }

  sliceArray<T = Opaque>(start: number, end: number): T[] {
    return this.stack.sliceInner(start, end);
  }

  capture(items: number): CapturedStack {
    let end = this.sp + 1;
    let start = end - items;
    return this.stack.slice(start, end);
  }

  reset() {
    this.stack.reset();
  }

  toArray() {
    return this.stack.slice(this.fp, this.sp + 1);
  }
}
