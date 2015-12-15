import { InternedString, dict, assign } from 'glimmer-util';
import { RawTemplate } from './compiler';

export default class SymbolTable {
  private parent: SymbolTable;
  private top: SymbolTable;
  private template: RawTemplate;
  private locals = dict<number>();
  public size = 1;

  constructor(parent: SymbolTable, template: RawTemplate) {
    this.parent = parent;
    this.top = parent ? parent.top : this;
    this.template = template;
  }

  cloneFor(template: RawTemplate): SymbolTable {
    let table = new SymbolTable(this.parent, template);
    table.locals = assign({}, this.locals);
    table.size = this.size;
    return table;
  }

  initPositional(positional: InternedString[]): this {
    if (positional) positional.forEach(s => this.putPositional(s));
    return this;
  }

  initNamed(named: InternedString[]): this {
    if (named) named.forEach(s => this.locals[<string>s] = this.size++);

    return this;
  }

  putNamed(names: InternedString[]) {
    let top = this.top;
    names.forEach(s => top.putSingleNamed(s));
  }

  get(name: InternedString): number {
    let { locals, parent } = this;

    let symbol = locals[<string>name];

    if (!symbol && parent) {
      symbol = parent.get(name);
    }

    return symbol;
  }

  isTop(): boolean {
    return this.top === this;
  }

  private putSingleNamed(name: InternedString) {
    if (!this.locals[<string>name]) {
      this.locals[<string>name] = this.size++;
      this.template.named = this.template.named || [];
      this.template.named.push(name);
    }
  }

  private putPositional(name: InternedString): number {
    let position = this.locals[<string>name];

    if (!position) {
      position = this.locals[<string>name] = this.top.size++;
    }

    return position;
  }
}
