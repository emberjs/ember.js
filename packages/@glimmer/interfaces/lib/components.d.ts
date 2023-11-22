import type { Dict } from './core';
import type { InternalComponentManager } from './managers';
import type { Reference } from './references';
import type { ScopeSlot } from './runtime';
import type { CompilableProgram } from './template';
import type { ProgramSymbolTable } from './tier1/symbol-table';

export type ComponentDefinitionState = object;
export type ComponentInstanceState = unknown;

declare const CapabilityBrand: unique symbol;
export type CapabilityMask = number & {
  [CapabilityBrand]: never;
};

export interface ComponentDefinition<
  D extends ComponentDefinitionState = ComponentDefinitionState,
  I = ComponentInstanceState,
  M extends InternalComponentManager<I, D> = InternalComponentManager<I, D>,
> {
  resolvedName: string | null;
  handle: number;
  state: D;
  manager: M;
  capabilities: CapabilityMask;
  compilable: CompilableProgram | null;
}

export interface ComponentInstance<
  D extends ComponentDefinitionState = ComponentDefinitionState,
  I = ComponentInstanceState,
  M extends InternalComponentManager<I, D> = InternalComponentManager<I, D>,
> {
  definition: ComponentDefinition<D, I>;
  manager: M;
  capabilities: CapabilityMask;
  state: I;
  handle: number;
  table: ProgramSymbolTable;
  lookup: Record<string, ScopeSlot> | null;
}

export interface PreparedArguments {
  positional: ReadonlyArray<Reference>;
  named: Dict<Reference>;
}
