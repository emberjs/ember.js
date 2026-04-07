import type { Encoder } from './compile/index.js';
import type { ComponentDefinition, ComponentDefinitionState } from './components.js';
import type { Nullable } from './core.js';
import type { Environment, HelperDefinitionState, Owner, Program } from './runtime.js';
import type { ModifierDefinitionState } from './runtime/modifier.js';
import type { ResolvedComponentDefinition } from './serialize.js';
import type { BlockMetadata, STDLib, Template } from './template.js';
import type { SomeVmOp, VmMachineOp, VmOp } from './vm-opcodes.js';

export type CreateRuntimeOp = (heap: ProgramHeap) => RuntimeOp;

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

export interface ProgramHeap {
  pushRaw(value: number): void;
  pushOp(name: VmOp, op1?: number, op2?: number, op3?: number): void;
  pushMachine(name: VmMachineOp, op1?: number, op2?: number, op3?: number): void;
  malloc(): number;
  finishMalloc(handle: number, scopeSize: number): void;
  offset: number;

  // for debugging
  getaddr(handle: number): number;
  sizeof(handle: number): number;
  getbyaddr(address: number): number;
  setbyaddr(address: number, value: number): void;

  /**
   * Return the number of entries in the table. A handle is legal if
   * it is less than this number.
   *
   * @debugging
   */
  entries(): number;
}

/**
 * The `EvaluationContext` is the context that remains the same across all of the templates and
 * evaluations in a single program.
 *
 * Note that multiple programs can co-exist on the same page, sharing tracking logic (and the
 * global tracking context) but having different *evaluation* contexts.
 */
export interface EvaluationContext {
  /**
   * The program's environment, which contains customized framework behavior.
   */
  readonly env: Environment;
  /**
   * The compiled program itself: the constants and heap
   */
  readonly program: Program;
  /**
   * The offsets to stdlib functions
   */
  readonly stdlib: STDLib;
  /**
   * A framework-specified resolver for resolving free variables in classic templates.
   *
   * A strict component can invoke a classic component and vice versa, but only classic components
   * will use the resolver. If no resolver is available in the `ProgramContext`, only strict components
   * will compile and run.
   */
  readonly resolver: Nullable<ClassicResolver>;
  // Create a runtime op from the heap
  readonly createOp: CreateRuntimeOp;
}

/**
 * Options for compiling a specific template. This carries
 * along the static information associated with the entire
 * template when compiling blocks nested inside of it.
 */
export interface CompilationContext {
  readonly evaluation: EvaluationContext;
  readonly encoder: Encoder;
  readonly meta: BlockMetadata;
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
    isOptional?: false,
    debugName?: string
  ): ComponentDefinition;
  component(
    definitionState: ComponentDefinitionState,
    owner: object,
    isOptional?: boolean,
    debugName?: string
  ): ComponentDefinition | null;

  resolvedComponent(
    definitionState: ResolvedComponentDefinition,
    resolvedName: string
  ): ComponentDefinition;
}

export interface RuntimeConstants {
  hasHandle(handle: number): boolean;
  getValue<T>(handle: number): T;
  getArray<T>(handle: number): T[];
}

export type ProgramConstants = CompileTimeConstants & ResolutionTimeConstants & RuntimeConstants;

export interface CompileTimeArtifacts {
  heap: ProgramHeap;
  constants: ProgramConstants;
}

export interface ClassicResolver<O extends Owner = Owner> {
  lookupHelper?(name: string, owner: O): Nullable<HelperDefinitionState>;
  lookupModifier?(name: string, owner: O): Nullable<ModifierDefinitionState>;
  lookupComponent?(name: string, owner: O): Nullable<ResolvedComponentDefinition>;

  // TODO: These are used to lookup keywords that are implemented as helpers/modifiers.
  // We should try to figure out a cleaner way to do this.
  lookupBuiltInHelper?(name: string): Nullable<HelperDefinitionState>;
  lookupBuiltInModifier?(name: string): Nullable<ModifierDefinitionState>;
  lookupComponent?(name: string, owner: O): Nullable<ResolvedComponentDefinition>;
}
