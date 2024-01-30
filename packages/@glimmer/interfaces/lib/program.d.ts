import type { Encoder } from './compile/index.js';
import type { ComponentDefinition, ComponentDefinitionState } from './components.js';
import type { HelperDefinitionState } from './runtime.js';
import type { ModifierDefinitionState } from './runtime/modifier.js';
import type { CompileTimeResolver, ResolvedComponentDefinition } from './serialize.js';
import type { ContainingMetadata, STDLib, Template } from './template.js';
import type { SomeVmOp, VmMachineOp, VmOp } from './vm-opcodes.js';

export type CreateRuntimeOp = (heap: CompileTimeHeap) => RuntimeOp;

export interface RuntimeOp {
  offset: number;
  type: SomeVmOp;
  op1: number;
  op2: number;
  op3: number;
  size: number;
  isMachine: 0 | 1;
}

export interface SerializedHeap {
  buffer: ArrayBuffer;
  table: number[];
  handle: number;
}

export interface OpcodeHeap {
  getbyaddr(address: number): number;
}

export interface CompileTimeHeap extends OpcodeHeap {
  pushRaw(value: number): void;
  pushOp(name: VmOp, op1?: number, op2?: number, op3?: number): void;
  pushMachine(name: VmMachineOp, op1?: number, op2?: number, op3?: number): void;
  malloc(): number;
  finishMalloc(handle: number, scopeSize: number): void;
  capture(offset?: number): SerializedHeap;
  offset: number;

  // for debugging
  getaddr(handle: number): number;
  sizeof(handle: number): number;
  getbyaddr(address: number): number;
  setbyaddr(address: number, value: number): void;
}

export interface RuntimeHeap extends OpcodeHeap {
  getaddr(handle: number): number;
  sizeof(handle: number): number;
}

export interface CompileTimeCompilationContext {
  // The offsets to stdlib functions
  readonly stdlib: STDLib;

  readonly createOp: CreateRuntimeOp;

  // Interned constants
  readonly constants: CompileTimeConstants & ResolutionTimeConstants;

  // The mechanism of resolving names to values at compile-time
  readonly resolver: CompileTimeResolver;

  // The heap that the program is serializing into
  readonly heap: CompileTimeHeap;
}

/**
 * Options for compiling a specific template. This carries
 * along the static information associated with the entire
 * template when compiling blocks nested inside of it.
 */
export interface TemplateCompilationContext {
  readonly program: CompileTimeCompilationContext;
  readonly encoder: Encoder;
  readonly meta: ContainingMetadata;
}

export type EMPTY_ARRAY = Array<ReadonlyArray<never>>;

export type ConstantPool = unknown[];

/**
 * Constants are interned values that are referenced as numbers in the program.
 * The constant pool is a part of the program, and is always transmitted
 * together with the program.
 */
export interface CompileTimeConstants {
  value(value: unknown): number;
  array(values: unknown[] | readonly unknown[]): number;
  toPool(): ConstantPool;
}

/**
 * Resolution happens when components are first loaded, either via the resolver
 * or via looking them up in template scope.
 */
export interface ResolutionTimeConstants {
  // TODO: The default template is unique per-program. This should likely belong
  // in StdLib, but it's not really possible to thread it through that way
  // currently.
  defaultTemplate: Template;

  helper(
    definitionState: HelperDefinitionState,
    resolvedName: string | null,
    isOptional: true
  ): number | null;
  helper(definitionState: HelperDefinitionState, resolvedName?: string | null): number;

  modifier(
    definitionState: ModifierDefinitionState,
    resolvedName: string | null,
    isOptional: true
  ): number | null;
  modifier(definitionState: ModifierDefinitionState, resolvedName?: string | null): number;

  component(
    definitionState: ComponentDefinitionState,
    owner: object,
    isOptional?: false
  ): ComponentDefinition;
  component(
    definitionState: ComponentDefinitionState,
    owner: object,
    isOptional?: boolean
  ): ComponentDefinition | null;

  resolvedComponent(
    definitionState: ResolvedComponentDefinition,
    resolvedName: string
  ): ComponentDefinition;
}

export interface RuntimeConstants {
  getValue<T>(handle: number): T;
  getArray<T>(handle: number): T[];
}

export interface CompileTimeArtifacts {
  heap: CompileTimeHeap;
  constants: CompileTimeConstants & ResolutionTimeConstants;
}
