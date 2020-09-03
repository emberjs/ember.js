export type U64 = number;
export type U32 = number;
export type I32 = number;

export class Stack {
  constructor(private vec: U64[] = []) {}

  clone(): Stack {
    return new Stack(this.vec.slice());
  }

  sliceFrom(start: U32): Stack {
    return new Stack(this.vec.slice(start));
  }

  slice(start: U32, end: I32): Stack {
    return new Stack(this.vec.slice(start, end));
  }

  copy(from: U32, to: U32) {
    this.vec[to] = this.vec[from];
  }

  // TODO: how to model u64 argument?
  writeRaw(pos: U32, value: U64): void {
    // TODO: Grow?
    this.vec[pos] = value;
  }

  // TODO: partially decoded enum?
  getRaw(pos: U32): U32 {
    return this.vec[pos];
  }

  reset(): void {
    this.vec.length = 0;
  }

  len(): number {
    return this.vec.length;
  }
}
