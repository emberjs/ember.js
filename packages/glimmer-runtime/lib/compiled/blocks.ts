import { OpSeq } from '../opcodes';
import { Program } from '../syntax';
import { Environment } from '../environment';
import { SymbolTable, ProgramSymbolTable } from 'glimmer-interfaces';
import { EMPTY_ARRAY } from '../utils';

import {
  EntryPointCompiler,
  InlineBlockCompiler
} from '../compiler';

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

export abstract class Block {
  protected compiled: Option<CompiledBlock> = null;

  constructor(public program: Program, public symbolTable: SymbolTable) {}
}

export class InlineBlock extends Block {
  constructor(program: Program, symbolTable: SymbolTable, public locals: ReadonlyArray<string> = EMPTY_ARRAY) {
    super(program, symbolTable);
  }

  hasPositionalParameters(): boolean {
    return !!this.locals.length;
  }

  compile(env: Environment): CompiledBlock {
    let compiled = this.compiled;
    if (compiled) return compiled;

    let ops = new InlineBlockCompiler(this, env).compile();
    return this.compiled = new CompiledBlock(ops);
  }
}

export class PartialBlock extends InlineBlock {
}

export abstract class TopLevelTemplate extends Block {
  public symbolTable: ProgramSymbolTable;
  public symbols: number;
}

export class EntryPoint extends TopLevelTemplate {
  protected compiled: Option<CompiledProgram> = null;

  compile(env: Environment): CompiledProgram {
    let compiled = this.compiled;
    if (compiled) return compiled;

    let ops = new EntryPointCompiler(this, env).compile();
    return this.compiled = new CompiledProgram(ops, this.symbolTable.size);
  }
}

export class Layout extends TopLevelTemplate {
  public hasNamedParameters: boolean;
  public hasYields: boolean;
  constructor(program: Program, symbolTable: SymbolTable, public named: string[], public yields: string[], public hasPartials: boolean) {
    super(program, symbolTable);
    this.hasNamedParameters = !!this.named.length;
    this.hasYields = !!this.yields.length;;
  }
}
