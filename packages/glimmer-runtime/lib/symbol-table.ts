import { InternedString, dict } from 'glimmer-util';
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

  initBlock({ locals }: { locals: InternedString[] }): this {
    this.initPositionals(locals);
    return this;
  }

  initLayout({ named, yields }: { named: InternedString[], yields: InternedString[] }): this {
    this.initNamed(named);
    this.initYields(yields);
    return this;
  }

  initPositionals(positionals: InternedString[]): this {
    if (positionals) positionals.forEach(s => this.locals[<string>s] = this.top.size++);
    return this;
  }

  initNamed(named: InternedString[]): this {
    if (named) named.forEach(s => this.named[<string>s] = this.top.size++);
    return this;
  }

  initYields(yields: InternedString[]): this {
    if (yields) yields.forEach(b => this.yields[<string>b] = this.top.size++);
    return this;
  }

  getYield(name: InternedString): number {
    let { yields, parent } = this;

    let symbol = yields[<string>name];

    if (!symbol && parent) {
      symbol = parent.getYield(name);
    }

    return symbol;
  }

  getNamed(name: InternedString): number {
    let { named, parent } = this;

    let symbol = named[<string>name];

    if (!symbol && parent) {
      symbol = parent.getNamed(name);
    }

    return symbol;
  }

  getLocal(name: InternedString): number {
    let { locals, parent } = this;

    let symbol = locals[<string>name];

    if (!symbol && parent) {
      symbol = parent.getLocal(name);
    }

    return symbol;
  }

  isTop(): boolean {
    return this.top === this;
  }
}
