import { Unique, Opaque, SymbolTable, Option, BlockSymbolTable } from "@glimmer/interfaces";
import { VersionedPathReference } from "@glimmer/reference";
import { Core as C, Statements as S, Expression, Core } from "@glimmer/wire-format";
import { OpcodeBuilder } from './opcode-builder';

export type Handle = Unique<"Handle">;

export interface Heap {
  push(name: /* TODO: Op */ number, op1?: number, op2?: number, op3?: number): void;
  malloc(): Handle;
  finishMalloc(handle: Handle): void;
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

export interface RawInlineBlock {
  scan(): BlockSyntax;
}

export interface CompilableTemplate<S extends SymbolTable> {
  symbolTable: S;
  compile(): Handle;
}

export interface Macros {
  blocks: Blocks;
  inlines: Inlines;
}

export type BlockSyntax = CompilableTemplate<BlockSymbolTable>;
export type BlockMacro = (params: C.Params, hash: C.Hash, template: Option<BlockSyntax>, inverse: Option<BlockSyntax>, builder: OpcodeBuilder) => void;
export type MissingBlockMacro = (name: string, params: C.Params, hash: C.Hash, template: Option<BlockSyntax>, inverse: Option<BlockSyntax>, builder: OpcodeBuilder) => void;

export interface Blocks {
  add(name: string, func: BlockMacro): void;
  addMissing(func: MissingBlockMacro): void;
  compile(name: string, params: C.Params, hash: C.Hash, template: Option<BlockSyntax>, inverse: Option<BlockSyntax>, builder: OpcodeBuilder): void;
}

export type AppendSyntax = S.Append;
export type AppendMacro = (name: string, params: Option<C.Params>, hash: Option<C.Hash>, builder: OpcodeBuilder) => ['expr', Expression] | true | false;

export interface Inlines {
  add(name: string, func: AppendMacro): void;
  addMissing(func: AppendMacro): void;
  compile(sexp: AppendSyntax, builder: OpcodeBuilder): ['expr', Expression] | true;
}

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

export type ComponentArgs = [Core.Params, Core.Hash, Option<BlockSyntax>, Option<BlockSyntax>];
export type Specifier = Opaque;

export interface ComponentBuilder {
  static(definition: Specifier, args: ComponentArgs): void;
}
