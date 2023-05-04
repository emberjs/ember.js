// eslint-disable-next-line n/no-extraneous-import
import { Dict } from './core';
import { InternalComponentCapability, InternalComponentManager } from './managers';
import { Reference } from './references';
import { ScopeSlot } from './runtime';
import { CompilableProgram } from './template';
import { ProgramSymbolTable } from './tier1/symbol-table';

export type ComponentDefinitionState = object;
export type ComponentInstanceState = unknown;

export interface ComponentDefinition<
  D extends ComponentDefinitionState = ComponentDefinitionState,
  I = ComponentInstanceState,
  M extends InternalComponentManager<I, D> = InternalComponentManager<I, D>
> {
  resolvedName: string | null;
  handle: number;
  state: D;
  manager: M;
  capabilities: InternalComponentCapability;
  compilable: CompilableProgram | null;
}

export interface ComponentInstance<
  D extends ComponentDefinitionState = ComponentDefinitionState,
  I = ComponentInstanceState,
  M extends InternalComponentManager<I, D> = InternalComponentManager<I, D>
> {
  definition: ComponentDefinition<D, I>;
  manager: M;
  capabilities: InternalComponentCapability;
  state: I;
  handle: number;
  table: ProgramSymbolTable;
  lookup: Record<string, ScopeSlot> | null;
}

export interface PreparedArguments {
  positional: ReadonlyArray<Reference>;
  named: Dict<Reference>;
}
