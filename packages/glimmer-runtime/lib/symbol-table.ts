import { Option, dict } from 'glimmer-util';
import { TemplateMeta } from 'glimmer-wire-format';

export default class SymbolTable {
  static forEntryPoint(meta: TemplateMeta): SymbolTable {
    return new SymbolTable(null, meta).initEntryPoint();
  }

  static forLayout(named: string[], yields: string[], hasPartials: boolean, meta: TemplateMeta): SymbolTable {
    return new SymbolTable(null, meta).initLayout(named, yields, hasPartials);
  }

  static forBlock(parent: SymbolTable, locals: string[]): SymbolTable {
    return new SymbolTable(parent, null).initBlock(locals);
  }

  private top: SymbolTable;
  private locals = dict<number>();
  private named = dict<number>();
  private yields = dict<number>();
  private partialArgs: Option<number> = null;
  public size = 1;

  constructor(private parent: Option<SymbolTable>, private meta: Option<TemplateMeta> = null) {
    this.top = parent ? parent.top : this;
  }

  initEntryPoint(): this {
    return this;
  }

  initBlock(locals: string[]): this {
    this.initPositionals(locals);
    return this;
  }

  initLayout(named: string[], yields: string[], hasPartials: boolean): this {
    this.initNamed(named);
    this.initYields(yields);
    this.initPartials(hasPartials);
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

  initPartials(hasPartials: boolean): this {
    if (hasPartials) this.top.partialArgs = this.top.size++;
    return this;
  }

  getMeta(): Option<TemplateMeta> {
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

  getPartialArgs(): number {
    return this.top.partialArgs || 0;
  }

  isTop(): boolean {
    return this.top === this;
  }
}

export const EMPTY_SYMBOL_TABLE = new SymbolTable(null);