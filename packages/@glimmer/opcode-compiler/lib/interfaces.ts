import {
  VMHandle,
  Opaque,
  SymbolTable,
  Option,
  BlockSymbolTable,
  ComponentCapabilities,
  CompileTimeProgram
} from '@glimmer/interfaces';
import { Core, SerializedTemplateBlock } from '@glimmer/wire-format';
import { Macros } from './syntax';

export interface EagerResolver<Specifier> {
  getCapabilities(specifier: Specifier): ComponentCapabilities;
}

export interface EagerCompilationOptions<Specifier, R extends EagerResolver<Specifier>> {
  resolver: R;
  program: CompileTimeProgram;
  macros: Macros;
}

export interface CompilableTemplate<S extends SymbolTable> {
  symbolTable: S;
  compile(): VMHandle;
}

export type CompilableBlock = CompilableTemplate<BlockSymbolTable>;

export type Primitive = undefined | null | boolean | number | string;

export type ComponentArgs = [Core.Params, Core.Hash, Option<CompilableBlock>, Option<CompilableBlock>];
export type Specifier = Opaque;

export interface ComponentBuilder {
  static(definition: number, args: ComponentArgs): void;
}

export interface ParsedLayout<Specifier = Opaque> {
  id?: Option<string>;
  block: SerializedTemplateBlock;
  referrer: Specifier;
}
