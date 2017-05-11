import { Option, Dict } from '../core';
import { TemplateMeta } from '@glimmer/wire-format';

export interface Symbols {
}

export interface CompilationMeta {
  symbols: string[];
  templateMeta: TemplateMeta;
  asPartial: boolean;
}

export interface SymbolTable {
  meta: CompilationMeta;
}

export interface ProgramSymbolTable extends SymbolTable {
  hasEval: boolean;
  symbols: string[];
}

export interface BlockSymbolTable extends SymbolTable {
  parameters: number[];
}

export default SymbolTable;
