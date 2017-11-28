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

  writeSmi(pos: u32, value: i32): void {
    this.vec[pos] = encodeSmi(value);
  }

  // TODO: partially decoded enum?
  getRaw(pos: u32): u32 {
    return this.vec[pos];
  }

  getSmi(pos: u32): i32 {
    return decodeSmi(this.vec[pos]);
  }

  reset(): void {
    this.vec.length = 0;
  }

  len(): number {
    return this.vec.length;
  }
}

export const enum PrimitiveType {
  NUMBER          = 0b000,
  FLOAT           = 0b001,
  STRING          = 0b010,
  BOOLEAN_OR_VOID = 0b011,
  NEGATIVE        = 0b100
}

function decodeSmi(smi: number): number {
  switch (smi & 0b111) {
    case PrimitiveType.NUMBER:
      return smi >> 3;
    case PrimitiveType.NEGATIVE:
      return -(smi >> 3);
    default:
      throw new Error('unreachable');
  }
}

function encodeSmi(primitive: number) {
  if (primitive < 0) {
    return Math.abs(primitive) << 3 | PrimitiveType.NEGATIVE;
  } else {
    return primitive << 3 | PrimitiveType.NUMBER;
  }
}
