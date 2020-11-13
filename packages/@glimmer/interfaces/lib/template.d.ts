import { Operand, SerializedTemplateBlock, SerializedInlineBlock } from './compile';
import { EncoderError } from './compile/encoder';
import { Option } from './core';
import { InternalComponentCapabilities } from './managers/internal/component';
import { ConstantPool, SerializedHeap, SyntaxCompilationContext } from './program';
import { Owner } from './runtime';
import { BlockSymbolTable, ProgramSymbolTable, SymbolTable } from './tier1/symbol-table';

export type CompilableProgram = CompilableTemplate<ProgramSymbolTable>;
export type CompilableBlock = CompilableTemplate<BlockSymbolTable>;

export interface LayoutWithContext {
  readonly id: string;
  readonly block: SerializedTemplateBlock;
  readonly moduleName: string;
  readonly owner: Owner | null;
  readonly asPartial?: boolean;
}

export interface BlockWithContext {
  readonly block: SerializedInlineBlock;
  readonly containingLayout: LayoutWithContext;
}

/**
 * Environment specific template.
 */
export interface TemplateOk {
  result: 'ok';

  /**
   * Module name associated with the template, used for debugging purposes
   */
  moduleName: string;

  // internal casts, these are lazily created and cached
  asLayout(): CompilableProgram;
  asPartial(): CompilableProgram;
  asWrappedLayout(): CompilableProgram;
}

export interface TemplateError {
  result: 'error';

  problem: string;
  span: {
    start: number;
    end: number;
  };
}

export type Template = TemplateOk | TemplateError;

export type TemplateFactory = (owner?: Owner) => Template;

export interface STDLib {
  main: number;
  'cautious-append': number;
  'trusting-append': number;
}

export type SerializedStdlib = [number, number, number];

export type STDLibName = keyof STDLib;

export type CompilerBuffer = Array<Operand>;

export interface ResolvedLayout {
  handle: number;
  capabilities: InternalComponentCapabilities;
  compilable: Option<CompilableProgram>;
}

export type OkHandle = number;
export interface ErrHandle {
  handle: number;
  errors: EncoderError[];
}

export type HandleResult = OkHandle | ErrHandle;

export interface NamedBlocks {
  get(name: string): Option<CompilableBlock>;
  has(name: string): boolean;
  with(name: string, block: Option<CompilableBlock>): NamedBlocks;
  hasAny: boolean;
  names: string[];
}

export interface ContainingMetadata {
  asPartial: boolean;
  evalSymbols: Option<string[]>;
  upvars: Option<string[]>;
  moduleName: string;
  owner: Owner | null;
  size: number;
}

export interface CompilerArtifacts {
  heap: SerializedHeap;
  constants: ConstantPool;
}

export interface Unhandled {
  'not-handled': true;
}

export interface CompilableTemplate<S extends SymbolTable = SymbolTable> {
  symbolTable: S;
  compile(context: SyntaxCompilationContext): HandleResult;
}
