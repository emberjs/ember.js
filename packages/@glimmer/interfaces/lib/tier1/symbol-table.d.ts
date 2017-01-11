import { Option, Dict } from '../core';
import { TemplateMeta } from 'glimmer-wire-format';


export interface Symbols {
  named: Option<Dict<number>>;
  yields: Option<Dict<number>>;
  locals: Option<Dict<number>>;
  partialArgs: Option<number>;
}

export interface SymbolTable {
  getMeta(): Option<TemplateMeta>;
  getSymbols(): Symbols;
  getSymbol(kind: 'local' | 'named' | 'yields', name: string): Option<number>;
  getPartialArgs(): Option<number>;
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