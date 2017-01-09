export class CompiledBlock {
  constructor(public start: number, public end: number) {
  }
}

export class CompiledProgram extends CompiledBlock {
  constructor(start: number, end: number, public symbols: number) {
    super(start, end);
  }
}

export class CompiledLayout extends CompiledBlock {
  constructor(slice: Slice, public prelude: Slice, public symbols: number) {
    super(slice);
  }
}