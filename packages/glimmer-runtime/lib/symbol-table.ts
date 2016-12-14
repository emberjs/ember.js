import { Option, Dict, dict } from 'glimmer-util';
import { TemplateMeta } from 'glimmer-wire-format';
import {
  SymbolTable,
  ProgramSymbolTable as IProgramSymbolTable,
  BlockSymbolTable as IBlockSymbolTable
} from 'glimmer-interfaces';

export function entryPoint(meta: Option<TemplateMeta>): ProgramSymbolTable {
  return new ProgramSymbolTable(meta);
}

export interface SymbolTable {
  getMeta(): Option<TemplateMeta>;
  getSymbol(kind: 'local' | 'named' | 'yields', name: string): Option<number>;
  getPartialArgs(): Option<number>;
  isTop(): boolean;
}

export interface ProgramSymbolTable extends SymbolTable {
  size: number;
  getSymbol(kind: 'local', name: string): null;
  getSymbol(kind: 'named' | 'yields', name: string): Option<number>;
}

export interface BlockSymbolTable extends SymbolTable {
  getSymbol(kind: 'local' | 'named' | 'yields', name: string): Option<number>;
}

export default SymbolTable;

export abstract class BaseSymbolTable implements SymbolTable {
  protected abstract program: SymbolTable;
  abstract getMeta(): Option<TemplateMeta>;
  abstract getSymbol(kind: never, name: string): Option<number>;
  abstract getPartialArgs(): Option<number>;
  abstract isTop(): boolean;
}

export function entryPoint(meta: Option<TemplateMeta>): ProgramSymbolTable {
  return new ProgramSymbolTable(meta);
}

export function layout(meta: TemplateMeta, wireNamed: string[], wireYields: string[], hasPartials: boolean): ProgramSymbolTable {
  let { named, yields, partialSymbol, size } = symbols(wireNamed, wireYields, hasPartials);
  return new ProgramSymbolTable(meta, named, yields, partialSymbol, size);
}

export function block(parent: SymbolTable, locals: string[]): SymbolTable {
  let localsMap = dict<number>();
  let program = parent['program'];
  locals.forEach(l => localsMap[l] = program.size++);
  return new BlockSymbolTable(parent, program, localsMap);
}

function symbols(named: string[], yields: string[], hasPartials: boolean): { named: Dict<number>, yields: Dict<number>, partialSymbol: Option<number>, size: number } {
  let yieldMap = dict<number>();
  let namedMap = dict<number>();

  let size = 1;

  yields.forEach(y => yieldMap[y] = size++);
  named.forEach(n => namedMap[n] = size++);

  let partialSymbol: Option<number> = hasPartials ? size++ : null;

  return { named: namedMap, yields: yieldMap, partialSymbol, size };
}

export class ProgramSymbolTable extends BaseSymbolTable {
  program: this;

  constructor(
    private meta: Option<TemplateMeta>,
    private named = dict<number>(),
    private yields = dict<number>(),
    private partialArgs: Option<number> = null,
    public size = 1
  ) {
    super();
    this.program = this;
  }

  getMeta(): Option<TemplateMeta> {
    return this.meta;
  }

  getSymbol(kind: 'local', name: string): null;
  getSymbol(kind: 'local' | 'named' | 'yields', name: string): Option<number> {
    if (kind === 'local') return null;
    return this[kind][name];
  }

  getPartialArgs(): number {
    return this.partialArgs || 0;
  }

  isTop(): true {
    return true;
  }
}

export class BlockSymbolTable extends BaseSymbolTable {
  constructor(private parent: SymbolTable, protected program: ProgramSymbolTable, private locals: Dict<number>) {
    super();
  }

  getMeta(): Option<TemplateMeta> {
    return this.program.getMeta();
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

    let symbol: Option<number> = locals[name];

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

  getSymbol(kind: never, name: string): number {
    throw new Error("BUG: Calling getSymbol on EMPTY_SYMBOL_TABLE");
  },

  isTop(): false {
    return false;
  }
}

export const EMPTY_SYMBOL_TABLE: SymbolTable = {
  getMeta() {
    return null;
  },

  getSymbol(kind: never, name: string): number {
    throw new Error("BUG: Calling getSymbol on EMPTY_SYMBOL_TABLE");
  },

  getPartialArgs(): Option<number> {
    return null;
  },

  isTop(): boolean {
    return false;
  }
};
