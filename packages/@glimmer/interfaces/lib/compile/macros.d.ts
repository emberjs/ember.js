import * as WireFormat from './wire-format';
import { NamedBlocks, ContainingMetadata, Unhandled } from '../template';
import { TemplateCompilationContext } from '../program';
import { StatementCompileActions } from './encoder';
import { CompileTimeResolver } from '../serialize';
import { Option } from '../core';

export interface Macros {
  blocks: MacroBlocks;
  inlines: MacroInlines;
}

export interface MacroContext {
  resolver: CompileTimeResolver;
  meta: ContainingMetadata;
}

export type BlockMacro = (
  params: WireFormat.Core.Params,
  hash: WireFormat.Core.Hash,
  blocks: NamedBlocks,
  context: MacroContext
) => StatementCompileActions;

export type AppendMacro = (
  name: string,
  params: Option<WireFormat.Core.Params>,
  hash: Option<WireFormat.Core.Hash>,
  context: MacroContext
) => StatementCompileActions | Unhandled;

export type MissingBlockMacro = (
  name: string,
  params: WireFormat.Core.Params,
  hash: WireFormat.Core.Hash,
  blocks: NamedBlocks,
  context: MacroContext
) => StatementCompileActions;

export interface MacroBlocks {
  add(name: string, func: BlockMacro): void;
  addMissing(func: MissingBlockMacro): void;
  compile(
    name: string,
    params: WireFormat.Core.Params,
    hash: WireFormat.Core.Hash,
    blocks: NamedBlocks,
    context: TemplateCompilationContext
  ): StatementCompileActions;
}

export class MacroInlines {
  add(name: string, func: AppendMacro): void;
  addMissing(func: AppendMacro): void;
  compile(
    sexp: WireFormat.Statements.Append,
    context: TemplateCompilationContext
  ): StatementCompileActions | Unhandled;
}
