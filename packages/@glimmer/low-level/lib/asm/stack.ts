export type u64 = number;
export type u32 = number;
export type i32 = number;

export class Stack {
  constructor(private vec: u64[] = []) {}

  clone(): Stack {
    return new Stack(this.vec.slice());
  }

  sliceFrom(start: u32): Stack {
    return new Stack(this.vec.slice(start));
  }

  slice(start: u32, end: i32): Stack {
    return new Stack(this.vec.slice(start, end));
  }

  copy(from: u32, to: u32) {
    this.vec[to] = this.vec[from];
  }

  // TODO: how to model u64 argument?
  writeRaw(pos: u32, value: u64): void {
    // TODO: Grow?
    this.vec[pos] = value;
  }

  // TODO: partially decoded enum?
  getRaw(pos: u32): u32 {
    return this.vec[pos];
  }

  reset(): void {
    this.vec.length = 0;
  }

  len(): number {
    return this.vec.length;
  }
}
