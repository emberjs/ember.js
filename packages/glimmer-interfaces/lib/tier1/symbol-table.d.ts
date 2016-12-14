import { Option } from '../core';
import { TemplateMeta } from 'glimmer-wire-format';

export interface SymbolTable {
  getMeta(): Option<TemplateMeta>;
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