import { Maybe, Opaque, Option } from './core';
import {
  BlockSymbolTable,
  ProgramSymbolTable,
  SymbolTable
} from './tier1/symbol-table';
import ComponentCapabilities from './component-capabilities';
import { CompileTimeConstants } from './program';
import { Statement, SerializedTemplateBlock } from "@glimmer/wire-format";

export type CompilableBlock = CompilableTemplate<BlockSymbolTable>;
export type CompilableProgram = CompilableTemplate<ProgramSymbolTable>;

export interface ParsedLayout<TemplateMeta = Opaque> {
  id?: Option<string>;
  block: SerializedTemplateBlock;
  referrer: TemplateMeta;
}

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
  trustingGuardedAppend: number;
  cautiousGuardedAppend: number;
}

export interface CompileTimeLookup<TemplateMeta> {
  getCapabilities(handle: number): ComponentCapabilities;
  getLayout(handle: number): Option<CompilableProgram>;

  // This interface produces module locators (and indicates if a name is present), but does not
  // produce any actual objects. The main use-case for producing objects is handled above,
  // with getCapabilities and getLayout, which drastically shrinks the size of the object
  // that the core interface is forced to reify.
  lookupHelper(name: string, referrer: TemplateMeta): Option<number>;
  lookupModifier(name: string, referrer: TemplateMeta): Option<number>;
  lookupComponentDefinition(name: string, referrer: TemplateMeta): Option<number>;
  lookupPartial(name: string, referrer: TemplateMeta): Option<number>;
}
export interface Compiler {
  stdLib: Option<STDLib>;
  constants: CompileTimeConstants;
  resolver: CompileTimeLookup<Opaque>;

  add(statements: Statement[], containingLayout: ParsedLayout, asPartial: boolean, stdLib: Option<STDLib>): number;
}

export interface CompilableTemplate<S = SymbolTable> {
  symbolTable: S;
  compile(): number;
}
