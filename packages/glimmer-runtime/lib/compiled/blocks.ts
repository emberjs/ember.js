import { OpSeq } from '../opcodes';
import { Program } from '../syntax';
import { Environment } from '../environment';
import { SymbolTable, ProgramSymbolTable } from 'glimmer-interfaces';
import { EMPTY_ARRAY } from '../utils';

import { Option } from 'glimmer-util';

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
