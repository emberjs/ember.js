import {
  BlockSymbolTable,
  ProgramSymbolTable,
  SymbolTable,
} from '@glimmer/interfaces';

import { Handle } from '../environment';

export interface CompilableTemplate<S extends SymbolTable = SymbolTable> {
  symbolTable: S;
  compile(): Handle;
}

export type BlockSyntax = CompilableTemplate<BlockSymbolTable>;
export type TopLevelSyntax = CompilableTemplate<ProgramSymbolTable>;

export interface ScannableTemplate<S extends SymbolTable> {
  scan(): CompilableTemplate<S>;
}
