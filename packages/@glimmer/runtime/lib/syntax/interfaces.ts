import {
  BlockSymbolTable,
  ProgramSymbolTable,
  SymbolTable
} from '@glimmer/interfaces';

export interface CompilableTemplate<S extends SymbolTable = SymbolTable> {
  symbolTable: S;
  compile(): number;
}

export type BlockSyntax = CompilableTemplate<BlockSymbolTable>;
export type TopLevelSyntax = CompilableTemplate<ProgramSymbolTable>;

export interface ScannableTemplate<S extends SymbolTable> {
  scan(): CompilableTemplate<S>;
}
