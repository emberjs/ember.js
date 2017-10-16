import {
  BlockSymbolTable,
  ProgramSymbolTable,
  SymbolTable,
  VMHandle
} from '@glimmer/interfaces';

export interface CompilableTemplate<S extends SymbolTable = SymbolTable> {
  symbolTable: S;
  compile(): VMHandle;
}

export type BlockSyntax = CompilableTemplate<BlockSymbolTable>;
export type TopLevelSyntax = CompilableTemplate<ProgramSymbolTable>;

export interface ScannableTemplate<S extends SymbolTable> {
  scan(): CompilableTemplate<S>;
}
