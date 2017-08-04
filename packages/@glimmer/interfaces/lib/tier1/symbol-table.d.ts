import { Option, Dict } from '../core';
import { TemplateMeta } from '@glimmer/wire-format';

export interface Symbols {
}

export interface SymbolTable {
  meta: TemplateMeta;
}

export interface ProgramSymbolTable extends SymbolTable {
  hasEval: boolean;
  symbols: string[];
}

export interface BlockSymbolTable extends SymbolTable {
  parameters: number[];
}

export default SymbolTable;
