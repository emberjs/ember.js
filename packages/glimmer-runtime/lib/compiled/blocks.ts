import { OpSeq } from '../opcodes';
import { Program } from '../syntax';
import { Environment } from '../environment';
import SymbolTable from '../symbol-table';
import { EMPTY_ARRAY } from '../utils';

import {
  EntryPointCompiler,
  InlineBlockCompiler
} from '../compiler';

export class CompiledBlock {
  public ops: OpSeq;
  public symbols: number;

  constructor(ops: OpSeq, symbols: number) {
    this.ops = ops;
    this.symbols = symbols;
  }
}

export abstract class Block {
  protected compiled: CompiledBlock = null;

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
    return this.compiled = new CompiledBlock(ops, this.symbolTable.size);
  }
}

export class PartialBlock extends InlineBlock {
}

export abstract class TopLevelTemplate extends Block {
}

export class EntryPoint extends TopLevelTemplate {
  compile(env: Environment) {
    let compiled = this.compiled;
    if (compiled) return compiled;

    let ops = new EntryPointCompiler(this, env).compile();
    return this.compiled = new CompiledBlock(ops, this.symbolTable.size);
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
