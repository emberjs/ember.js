import { Opaque } from '@glimmer/util';

export const PTR = 0x80000000;
export const PTR_MASK = 0x7FFFFFFF;
export type Opcode = (m: Machine) => void;

export class Machine {
  private HEAP: Opaque[] = [];
  private stack = new Uint32Array(0x10000);

  private sp = 0;
  private bp = 0;
  private ip = 1;
  private ret = 0;
  private args = 0; // 16/16 count of positional/named

  next(): number {
    return this.ip++;
  }

  value(): number {
    return this.ret;
  }

  getHeap(ptr: number): Opaque {
    return this.HEAP[ptr & PTR_MASK];
  }

  push(val: number) {
    this.stack[this.sp++] = val;
  }

  pushHeap(val: Opaque) {
    let ptr = this.HEAP.length;
    this.HEAP.push(val);
    this.push(ptr | PTR);
  }

  popHeap(): Opaque {
    this.pop();
    return this.HEAP.pop();
  }

  pop(): number {
    return this.stack[--this.sp];
  }

  goto(target: number) {
    this.ip = target;
  }

  call(target: number, positional: number) {
    this.push(this.ip);
    this.ip = target;
    this.args = positional;
  }

  callee() {
    // bp - 0    = old bp
    // bp - 1    = old ip
    // bp - 2... = params
    this.push(this.bp);
    this.bp = this.sp;
  }

  param(n: number): number {
    return this.stack[this.bp - n];
  }

  alloca(size: number) {
    // reserve size bytes for local variables
    // bp + 1    = first local
    // bp + 2    = second local
    this.sp += size;
  }

  getLocal(n: number): number {
    return this.stack[this.bp + n + 1];
  }

  setLocal(n: number, v: number) {
    this.stack[this.bp + n] = v;
  }

  release(size: number) {
    this.sp -= size;
  }

  releaseHeap(size: number) {
    this.HEAP.length = this.HEAP.length - size;
  }

  return(value: number) {
    // restore the old bp
    this.bp = this.pop();

    // jump to the return point
    this.ip = this.pop();

    this.ret = value;
  }

  exit(value: number) {
    this.ret = value;
    this.ip = 0;
  }

  returned(stack: number, heap: number) {
    // the inverse of the push and pushHeap calls
    // made to pass parameters
    this.release(stack);
    this.releaseHeap(heap);
  }
}