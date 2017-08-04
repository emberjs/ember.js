import { Unique, Opaque, SymbolTable, Option, BlockSymbolTable } from "@glimmer/interfaces";
import { VersionedPathReference } from "@glimmer/reference";
import { Core, SerializedTemplateBlock, TemplateMeta } from "@glimmer/wire-format";
import { Macros } from './syntax';

export type Handle = Unique<"Handle">;

export interface Heap {
  push(name: /* TODO: Op */ number, op1?: number, op2?: number, op3?: number): void;
  malloc(): Handle;
  finishMalloc(handle: Handle): void;

  // for debugging
  getaddr(handle: Handle): number;
  sizeof(handle: Handle): number;
}

export interface ComponentCapabilities {
  dynamicLayout: boolean;
  dynamicTag: boolean;
  prepareArgs: boolean;
  createArgs: boolean;
  attributeHook: boolean;
  elementHook: boolean;
}

export interface EagerResolver<Specifier> {
  getCapabilities(specifier: Specifier): ComponentCapabilities;
}

export interface EagerCompilationOptions<Specifier, R extends EagerResolver<Specifier>> {
  resolver: R;
  program: Program;
  macros: Macros;
}

export interface CompilableTemplate<S extends SymbolTable> {
  symbolTable: S;
  compile(): Handle;
}

export type CompilableBlock = CompilableTemplate<BlockSymbolTable>;

export interface Program {
  [key: number]: never;

  constants: Constants;
  heap: Heap;

  opcode(offset: number): Opcode;
}

export interface Opcode {
  offset: number;
  type: number;
  op1: number;
  op2: number;
  op3: number;
}

export type Primitive = undefined | null | boolean | number | string;

export interface Constants {
  reference(value: VersionedPathReference<Opaque>): number;
  string(value: string): number;
  stringArray(strings: string[]): number;
  array(values: number[]): number;
  table(t: SymbolTable): number;
  specifier(specifier: Opaque): number;
  serializable(value: Opaque): number;
}

export interface LazyConstants extends Constants {
  other(value: Opaque): number;
}

export type ComponentArgs = [Core.Params, Core.Hash, Option<CompilableBlock>, Option<CompilableBlock>];
export type Specifier = Opaque;

export interface ComponentBuilder {
  static(definition: Specifier, args: ComponentArgs): void;
}

export interface ParsedLayout {
  id?: Option<string>;
  block: SerializedTemplateBlock;
  meta: TemplateMeta;
}
