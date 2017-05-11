import {
  BlockSymbolTable,
  ProgramSymbolTable,
  SymbolTable,
} from '@glimmer/interfaces';
import {
  CompiledDynamicTemplate,
  CompiledStaticTemplate,
} from '../compiled/blocks';

import Environment from '../environment';

export interface CompilableTemplate<S extends SymbolTable> {
  symbolTable: S;
  compileStatic(env: Environment): CompiledStaticTemplate;
  compileDynamic(env: Environment): CompiledDynamicTemplate<S>;
}

export type Block = CompilableTemplate<BlockSymbolTable>;
export type Program = CompilableTemplate<ProgramSymbolTable>;

export interface ScannableTemplate<S extends SymbolTable> {
  scan(): CompilableTemplate<S>;
}
