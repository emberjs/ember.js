import { InternedString } from 'glimmer-util';
import { OpSeq } from '../opcodes';
import { Program } from '../syntax';
import { Environment } from '../environment';
import SymbolTable from '../symbol-table';
import {
  BlockMeta
} from 'glimmer-wire-format';

import {
  EntryPointCompiler,
  InlineBlockCompiler
} from '../compiler';

export interface BlockOptions {
  children: InlineBlock[];
  program: Program;
  symbolTable: SymbolTable;
  meta: BlockMeta;
}

export class CompiledBlock {
  public ops: OpSeq;
  public symbols: number;

  constructor(ops: OpSeq, symbols: number) {
    this.ops = ops;
    this.symbols = symbols;
  }
}

export abstract class Block {
  public meta: BlockMeta;
  public children: InlineBlock[];
  public program: Program;
  public symbolTable: SymbolTable;
  protected compiled: CompiledBlock = null;

  constructor(options: BlockOptions) {
    this.symbolTable = options.symbolTable || null;
    this.children = options.children;
    this.program = options.program;
    this.meta = options.meta;
  }
}

export interface InlineBlockOptions extends BlockOptions {
  locals: InternedString[];
}

export class InlineBlock extends Block {
  public locals: InternedString[];

  constructor(options: InlineBlockOptions) {
    super(options);
    this.locals = options.locals;
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
  initBlocks(blocks = this['children'], parentTable = this['symbolTable']): this {
    blocks.forEach(block => {
      let table = SymbolTable.initForBlock({ parent: parentTable, block });
      this.initBlocks(block['children'], table);
    });
    return this;
  }
}

export abstract class TopLevelTemplate extends Block {
  initBlocks(blocks = this['children'], parentTable = this['symbolTable']): this {
    blocks.forEach(block => {
      let table = SymbolTable.initForBlock({ parent: parentTable, block });
      this.initBlocks(block['children'], table);
    });
    return this;
  }
}

export class EntryPoint extends TopLevelTemplate {
  static create(options: BlockOptions): EntryPoint {
    let top = new EntryPoint(options);
    SymbolTable.initForEntryPoint(top);
    return top;
  }

  compile(env: Environment) {
    let compiled = this.compiled;
    if (compiled) return compiled;

    let ops = new EntryPointCompiler(this, env).compile();
    return this.compiled = new CompiledBlock(ops, this.symbolTable.size);
  }
}

export interface LayoutOptions extends BlockOptions {
  named: InternedString[];
  yields: InternedString[];
  program: Program;
}

export class Layout extends TopLevelTemplate {
  static create(options: LayoutOptions): Layout {
    let layout = new Layout(options);
    SymbolTable.initForLayout(layout);
    return layout;
  }

  public named: InternedString[];
  public yields: InternedString[];

  constructor(options: LayoutOptions) {
    super(options);

    let { named, yields } = options;

    // positional params in Ember may want this
    // this.locals = locals;
    this.named = named;
    this.yields = yields;
  }

  hasNamedParameters(): boolean {
    return !!this.named.length;
  }

  hasYields(): boolean {
    return !!this.yields.length;
  }
}
