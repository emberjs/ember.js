import type { PresentArray } from './array.js';
import type { EncoderError } from './compile/encoder.js';
import type { Operand, SerializedInlineBlock, SerializedTemplateBlock } from './compile/index.js';
import type { Nullable } from './core.js';
import type { InternalComponentCapabilities } from './managers/internal/component.js';
import type { CompileTimeCompilationContext, ConstantPool, SerializedHeap } from './program.js';
import type { Owner } from './runtime.js';
import type { BlockSymbolTable, ProgramSymbolTable, SymbolTable } from './tier1/symbol-table.js';

export interface CompilableProgram extends CompilableTemplate<ProgramSymbolTable> {
  moduleName: string;
}

export type CompilableBlock = CompilableTemplate<BlockSymbolTable>;

export interface LayoutWithContext {
  readonly id: string;
  readonly block: SerializedTemplateBlock;
  readonly moduleName: string;
  readonly owner: Owner | null;
  readonly scope: (() => unknown[]) | undefined | null;
  readonly isStrictMode: boolean;
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
  'cautious-non-dynamic-append': number;
  'trusting-non-dynamic-append': number;
}

export type SerializedStdlib = [number, number, number];

export type STDLibName = keyof STDLib;

export type CompilerBuffer = Array<Operand>;

export interface ResolvedLayout {
  handle: number;
  capabilities: InternalComponentCapabilities;
  compilable: Nullable<CompilableProgram>;
}

export type OkHandle = number;
export interface ErrHandle {
  handle: number;
  errors: PresentArray<EncoderError>;
}

export type HandleResult = OkHandle | ErrHandle;

export interface NamedBlocks {
  get(name: string): Nullable<SerializedInlineBlock>;
  has(name: string): boolean;
  with(name: string, block: Nullable<SerializedInlineBlock>): NamedBlocks;
  hasAny: boolean;
  names: string[];
}

export interface ContainingMetadata {
  evalSymbols: Nullable<string[]>;
  upvars: Nullable<string[]>;
  scopeValues: unknown[] | null;
  isStrictMode: boolean;
  moduleName: string;
  owner: Owner | null;
  size: number;
}

export interface CompilerArtifacts {
  heap: SerializedHeap;
  constants: ConstantPool;
}

export interface CompilableTemplate<S extends SymbolTable = SymbolTable> {
  symbolTable: S;
  compile(context: CompileTimeCompilationContext): HandleResult;
}
