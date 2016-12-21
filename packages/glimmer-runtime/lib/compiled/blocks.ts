import { OpSeq } from '../opcodes';

export class CompiledBlock {
  public ops: OpSeq;

  constructor(ops: OpSeq) {
    this.ops = ops;
  }
}

export class CompiledProgram extends CompiledBlock {
  constructor(ops: OpSeq, public symbols: number) {
    super(ops);
  }
}
