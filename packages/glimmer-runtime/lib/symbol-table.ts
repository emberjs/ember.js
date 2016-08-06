import { dict } from 'glimmer-util';
import { Block, InlineBlock, Layout, EntryPoint } from './compiled/blocks';

export default class SymbolTable {
  static initForEntryPoint(top: EntryPoint): SymbolTable {
    return top.symbolTable = new SymbolTable(null, top).initEntryPoint(top);
  }

  static initForLayout(layout: Layout): SymbolTable {
    return layout.symbolTable = new SymbolTable(null, layout).initLayout(layout);
  }

  static initForBlock({ parent, block }: { parent: SymbolTable, block: InlineBlock }): SymbolTable {
    return block.symbolTable = new SymbolTable(parent, block).initBlock(block);
  }

  private parent: SymbolTable;
  private top: SymbolTable;
  private template: Block;
  private locals   = dict<number>();
  private named    = dict<number>();
  private yields   = dict<number>();
  public size = 1;

  constructor(parent: SymbolTable, template: Block) {
    this.parent = parent;
    this.top = parent ? parent.top : this;
    this.template = template;
  }

  initEntryPoint(_: any): this {
    return this;
  }

  initBlock({ locals }: { locals: string[] }): this {
    this.initPositionals(locals);
    return this;
  }

  initLayout({ named, yields }: { named: string[], yields: string[] }): this {
    this.initNamed(named);
    this.initYields(yields);
    return this;
  }

  initPositionals(positionals: string[]): this {
    if (positionals) positionals.forEach(s => this.locals[s] = this.top.size++);
    return this;
  }

  initNamed(named: string[]): this {
    if (named) named.forEach(s => this.named[s] = this.top.size++);
    return this;
  }

  initYields(yields: string[]): this {
    if (yields) yields.forEach(b => this.yields[b] = this.top.size++);
    return this;
  }

  getYield(name: string): number {
    let { yields, parent } = this;

    let symbol = yields[name];

    if (!symbol && parent) {
      symbol = parent.getYield(name);
    }

    return symbol;
  }

  getNamed(name: string): number {
    let { named, parent } = this;

    let symbol = named[name];

    if (!symbol && parent) {
      symbol = parent.getNamed(name);
    }

    return symbol;
  }

  getLocal(name: string): number {
    let { locals, parent } = this;

    let symbol = locals[name];

    if (!symbol && parent) {
      symbol = parent.getLocal(name);
    }

    return symbol;
  }

  isTop(): boolean {
    return this.top === this;
  }
}
