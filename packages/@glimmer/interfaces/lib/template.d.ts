import { Maybe, Opaque, Option } from './core';
import { BlockSymbolTable, ProgramSymbolTable, SymbolTable } from './tier1/symbol-table';
import ComponentCapabilities from './component-capabilities';
import { CompileTimeConstants } from './program';
import { ComponentDefinition } from './components';
import { CompilableProgram } from './serialize';
import {
  Statement,
  SerializedTemplateBlock,
  Statements,
  Expression,
  Core,
  SerializedInlineBlock,
} from '@glimmer/wire-format';
import { CompileTimeProgram } from '@glimmer/interfaces';

export type CompilableBlock = CompilableTemplate<BlockSymbolTable>;

export interface LayoutWithContext<Locator = Opaque> {
  id?: Option<string>;
  block: SerializedTemplateBlock;
  referrer: Locator;
  asPartial: boolean;
}

export interface BlockWithContext<Locator = Opaque> {
  block: SerializedInlineBlock;
  containingLayout: LayoutWithContext<Locator>;
}

/**
 * Environment specific template.
 */
export interface Template<Locator = Opaque> {
  /**
   * Template identifier, if precompiled will be the id of the
   * precompiled template.
   */
  id: string;

  /**
   * Template meta (both compile time and environment specific).
   */
  referrer: Locator;

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
  getAppend(trusting: boolean): number;
}

export type CompilerBuffer = Array<number | (() => number)>;

export interface ResolvedLayout {
  handle: number;
  capabilities: ComponentCapabilities;
  compilable: Option<CompilableProgram>;
}

export type MaybeResolvedLayout =
  | {
      handle: null;
      capabilities: null;
      compilable: null;
    }
  | ResolvedLayout;

export interface Compiler<Builder = Opaque> {
  stdLib: STDLib;
  constants: CompileTimeConstants;

  add(statements: Statement[], containingLayout: LayoutWithContext): number;
  commit(size: number, encoder: CompilerBuffer): number;

  resolveLayoutForTag(tag: string, referrer: Opaque): MaybeResolvedLayout;
  resolveLayoutForHandle(handle: number): ResolvedLayout;
  resolveHelper(name: string, referrer: Opaque): Option<number>;
  resolveModifier(name: string, referrer: Opaque): Option<number>;

  compileInline(sexp: Statements.Append, builder: Builder): ['expr', Expression] | true;
  compileBlock(
    name: string,
    params: Core.Params,
    hash: Core.Hash,
    template: Option<CompilableBlock>,
    inverse: Option<CompilableBlock>,
    builder: Builder
  ): void;
  builderFor(containingLayout: LayoutWithContext): Builder;
}

export interface CompilableTemplate<S = SymbolTable> {
  symbolTable: S;
  compile(): number;
}
