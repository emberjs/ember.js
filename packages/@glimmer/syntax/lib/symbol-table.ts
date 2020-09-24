import { Core, Dict } from '@glimmer/interfaces';
import { dict, unreachable } from '@glimmer/util';

export abstract class SymbolTable {
  static top(): ProgramSymbolTable {
    return new ProgramSymbolTable();
  }

  abstract has(name: string): boolean;
  abstract get(name: string): number;

  abstract getLocalsMap(): Dict<number>;
  abstract getEvalInfo(): Core.EvalInfo;

  abstract allocateFree(name: string): number;
  abstract allocateNamed(name: string): number;
  abstract allocateBlock(name: string): number;
  abstract allocate(identifier: string): number;

  abstract setHasEval(): void;

  child(locals: string[]): BlockSymbolTable {
    let symbols = locals.map((name) => this.allocate(name));
    return new BlockSymbolTable(this, locals, symbols);
  }
}

export class ProgramSymbolTable extends SymbolTable {
  public symbols: string[] = [];
  public upvars: string[] = [];

  private size = 1;
  private named = dict<number>();
  private blocks = dict<number>();

  #hasEval = false;

  setHasEval(): void {
    this.#hasEval = true;
  }

  get hasEval(): boolean {
    return this.#hasEval;
  }

  has(_name: string): boolean {
    return false;
  }

  get(_name: string): number {
    throw unreachable();
  }

  getLocalsMap(): Dict<number> {
    return dict();
  }

  getEvalInfo(): Core.EvalInfo {
    let locals = this.getLocalsMap();
    return Object.keys(locals).map((symbol) => locals[symbol]);
  }

  allocateFree(name: string): number {
    let index = this.upvars.indexOf(name);

    if (index !== -1) {
      return index;
    }

    index = this.upvars.length;
    this.upvars.push(name);
    return index;
  }

  allocateNamed(name: string): number {
    let named = this.named[name];

    if (!named) {
      named = this.named[name] = this.allocate(name);
    }

    return named;
  }

  allocateBlock(name: string): number {
    if (name === 'inverse') {
      name = 'else';
    }

    let block = this.blocks[name];

    if (!block) {
      block = this.blocks[name] = this.allocate(`&${name}`);
    }

    return block;
  }

  allocate(identifier: string): number {
    this.symbols.push(identifier);
    return this.size++;
  }
}

export class BlockSymbolTable extends SymbolTable {
  constructor(private parent: SymbolTable, public symbols: string[], public slots: number[]) {
    super();
  }

  get locals(): string[] {
    return this.symbols;
  }

  has(name: string): boolean {
    return this.symbols.indexOf(name) !== -1 || this.parent.has(name);
  }

  get(name: string): number {
    let slot = this.symbols.indexOf(name);
    return slot === -1 ? this.parent.get(name) : this.slots[slot];
  }

  getLocalsMap(): Dict<number> {
    let dict = this.parent.getLocalsMap();
    this.symbols.forEach((symbol) => (dict[symbol] = this.get(symbol)));
    return dict;
  }

  getEvalInfo(): Core.EvalInfo {
    let locals = this.getLocalsMap();
    return Object.keys(locals).map((symbol) => locals[symbol]);
  }

  setHasEval(): void {
    this.parent.setHasEval();
  }

  allocateFree(name: string): number {
    return this.parent.allocateFree(name);
  }

  allocateNamed(name: string): number {
    return this.parent.allocateNamed(name);
  }

  allocateBlock(name: string): number {
    return this.parent.allocateBlock(name);
  }

  allocate(identifier: string): number {
    return this.parent.allocate(identifier);
  }
}
