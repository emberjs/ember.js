import { SymbolTable, ProgramSymbolTable, BlockSymbolTable } from '@glimmer/interfaces';

export interface OpSlice {
  start: number;
  end: number;
}

export class CompiledStaticTemplate implements OpSlice {
  constructor(public start: number, public end: number) {
  }
}

export class CompiledDynamicTemplate<S extends SymbolTable> implements OpSlice {
  constructor(public start: number, public end: number, public symbolTable: S) {
  }
}

export type CompiledDynamicBlock = CompiledDynamicTemplate<BlockSymbolTable>;
export type CompiledDynamicProgram = CompiledDynamicTemplate<ProgramSymbolTable>;
