import { Slice } from '../opcodes';

export class CompiledBlock {
  public start: number;
  public end: number;
  public slice: Slice;

  constructor(slice: Slice) {
    this.start = slice[0];
    this.end = slice[1];
    this.slice = slice;
  }
}

export class CompiledProgram extends CompiledBlock {
  constructor(slice: Slice, public symbols: number) {
    super(slice);
  }
}
