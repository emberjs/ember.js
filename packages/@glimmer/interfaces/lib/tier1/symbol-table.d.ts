import { Option, Dict } from '../core';
import { TemplateMeta } from '@glimmer/wire-format';
import { Opaque } from "@glimmer/interfaces";

export interface Symbols {
}

export interface SymbolTable {
  referer: Opaque;
}

export interface ProgramSymbolTable extends SymbolTable {
  hasEval: boolean;
  symbols: string[];
}

export interface BlockSymbolTable extends SymbolTable {
  parameters: number[];
}

export default SymbolTable;
