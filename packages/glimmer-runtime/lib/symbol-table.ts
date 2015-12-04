import { InternedString, dict } from 'glimmer-util';

export default class SymbolTable {
  private parent: SymbolTable;
  private top: SymbolTable;
  private locals = dict<number>();
  public size = 1;

  constructor(parent: SymbolTable) {
    this.parent = parent;
    this.top = parent ? parent.top : this;
  }

  init(symbols: InternedString[]): this {
    symbols.forEach(s => this.put(s));
    return this;
  }

  get(name: InternedString): number {
    let { locals, parent } = this;

    let symbol = locals[<string>name];

    if (!symbol && parent) {
      symbol = parent.get(name);
    }

    return symbol;
  }

  private put(name: InternedString): number {
    let position = this.locals[<string>name];

    if (!position) {
      position = this.locals[<string>name] = this.top.size++;
    }

    return position;
  }
}
