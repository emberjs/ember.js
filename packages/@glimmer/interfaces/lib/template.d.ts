import { Opaque } from './core';
import {
  BlockSymbolTable,
  ProgramSymbolTable,
  SymbolTable
} from './tier1/symbol-table';

export type CompilableBlock = CompilableTemplate<BlockSymbolTable>;
export type CompilableProgram = CompilableTemplate<ProgramSymbolTable>;

/**
 * Environment specific template.
 */
export interface Template<TemplateMeta = Opaque> {
  /**
   * Template identifier, if precompiled will be the id of the
   * precompiled template.
   */
  id: string;

  /**
   * Template meta (both compile time and environment specific).
   */
  referrer: TemplateMeta;

  hasEval: boolean;

  /**
   * Symbols computed at compile time.
   */
  symbols: string[];

  // internal casts, these are lazily created and cached
  asLayout(): CompilableProgram;
  asPartial(): CompilableProgram;
  asWrappedLayout(): CompilableProgram;
}

export interface STDLib {
  main: number;
  guardedAppend: number;
}

export interface CompilableTemplate<S = SymbolTable> {
  symbolTable: S;
  compile(stdlib?: STDLib): number;
}
