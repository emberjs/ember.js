import { Option, Dict, dict } from '@glimmer/util';
import { TemplateMeta } from '@glimmer/wire-format';
import {
  SymbolTable,
  ProgramSymbolTable as IProgramSymbolTable,
  BlockSymbolTable as IBlockSymbolTable,
  Symbols
} from '@glimmer/interfaces';

export function entryPoint(meta: Option<TemplateMeta>): ProgramSymbolTable {
  return new ProgramSymbolTable(meta);
}

export function layout(meta: TemplateMeta, wireNamed: string[], wireYields: string[], hasPartials: boolean): ProgramSymbolTable {
  let { named, yields, partialSymbol, size } = symbols(wireNamed, wireYields, hasPartials);
  return new ProgramSymbolTable(meta, named, yields, partialSymbol, size);
}

export function block(parent: SymbolTable, locals: string[]): SymbolTable {
  let localsMap: Option<Dict<number>> = null;
  let program = parent['program'];

  if (locals.length !== 0) {
    let map = localsMap = dict<number>();
    locals.forEach(l => map[l] = program.size++);
  }

  return new BlockSymbolTable(parent, program, localsMap);
}

function symbols(named: string[], yields: string[], hasPartials: boolean): { named: Option<Dict<number>>, yields: Option<Dict<number>>, partialSymbol: Option<number>, size: number } {
  let yieldsMap: Option<Dict<number>> = null;
  let namedMap: Option<Dict<number>> = null;

  let size = 1;

  if (yields.length !== 0) {
    let map = yieldsMap = dict<number>();
    yields.forEach(y => map[y] = size++);
  }

  if (named.length !== 0) {
    let map = namedMap = dict<number>();
    named.forEach(y => map[y] = size++);
  }

  let partialSymbol: Option<number> = hasPartials ? size++ : null;

  return { named: namedMap, yields: yieldsMap, partialSymbol, size };
}

export class ProgramSymbolTable implements IProgramSymbolTable {
  program: this;

  constructor(
    private meta: Option<TemplateMeta>,
    private named: Option<Dict<number>> = null,
    private yields: Option<Dict<number>> = null,
    private partialArgs: Option<number> = null,
    public size = 1
  ) {
    this.program = this;
  }

  getMeta(): Option<TemplateMeta> {
    return this.meta;
  }

  getSymbols(): Symbols {
    return {
      named: this.named,
      yields: this.yields,
      locals: null,
      partialArgs: this.partialArgs
    };
  }

  getSymbol(kind: 'local', name: string): null;
  getSymbol(kind: 'local' | 'named' | 'yields', name: string): Option<number>;
  getSymbol(kind: string, name: string): Option<number> {
    if (kind === 'local') return null;
    return this[kind] && this[kind][name];
  }

  getPartialArgs(): number {
    return this.partialArgs || 0;
  }
}

export class BlockSymbolTable implements IBlockSymbolTable {
  constructor(private parent: SymbolTable, protected program: ProgramSymbolTable, private locals: Option<Dict<number>>) {
  }

  getMeta(): Option<TemplateMeta> {
    return this.program.getMeta();
  }

  getSymbols(): Symbols {
    return {
      named: null,
      yields: null,
      locals: this.locals,
      partialArgs: null
    };
  }

  getSymbol(kind: 'local' | 'named' | 'yields', name: string): Option<number> {
    if (kind === 'local') {
      return this.getLocal(name);
    } else {
      return this.program.getSymbol(kind, name);
    }
  }

  private getLocal(name: string): Option<number> {
    let { locals, parent } = this;

    let symbol: Option<number> = locals && locals[name];

    if (!symbol && parent) {
      symbol = parent.getSymbol('local', name);
    }

    return symbol;
  }

  getPartialArgs(): Option<number> {
    return this.program.getPartialArgs();
  }
}

export const EMPTY_SYMBOL_TABLE: SymbolTable = {
  getMeta() {
    return null;
  },

  getSymbols(): Symbols {
    return {
      named: null,
      yields: null,
      locals: null,
      partialArgs: null
    };
  },

  getSymbol(_kind: never, _name: string): number {
    throw new Error("BUG: Calling getSymbol on EMPTY_SYMBOL_TABLE");
  },

  getPartialArgs(): Option<number> {
    return null;
  }
};
