import { dict } from 'glimmer-util';
import { BlockMeta } from 'glimmer-wire-format';

export default class SymbolTable {
  static forEntryPoint(meta: BlockMeta): SymbolTable {
    return new SymbolTable(null, meta).initEntryPoint();
  }

  static forLayout(named: string[], yields: string[], meta: BlockMeta): SymbolTable {
    return new SymbolTable(null, meta).initLayout(named, yields);
  }

  static forBlock(parent: SymbolTable, locals: string[]): SymbolTable {
    return new SymbolTable(parent, null).initBlock(locals);
  }

  private top: SymbolTable;
  private locals   = dict<number>();
  private named    = dict<number>();
  private yields   = dict<number>();
  public size = 1;

  constructor(private parent: SymbolTable, private meta: BlockMeta = null) {
    this.top = parent ? parent.top : this;
  }

  initEntryPoint(): this {
    return this;
  }

  initBlock(locals: string[]): this {
    this.initPositionals(locals);
    return this;
  }

  initLayout(named: string[], yields: string[]): this {
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

  getMeta(): BlockMeta {
    let { meta, parent } = this;

    if (!meta && parent) {
      meta = parent.getMeta();
    }

    return meta;
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
