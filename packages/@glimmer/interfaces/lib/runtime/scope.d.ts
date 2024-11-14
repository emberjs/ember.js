import type { Dict, Nullable } from '../core.js';
import type { Reference } from '../references.js';
import type { CompilableBlock } from '../template.js';
import type { BlockSymbolTable } from '../tier1/symbol-table.js';
import type { Owner } from './owner.js';

export type Block = CompilableBlock | number;

export type ScopeBlock = [CompilableBlock, Scope, BlockSymbolTable];
export type BlockValue = ScopeBlock[0 | 1 | 2];
export type ScopeSlot = Reference | ScopeBlock | null;

export interface Scope {
  // for debug only
  readonly slots: Array<ScopeSlot>;
  readonly owner: Owner;

  getSelf(): Reference;
  getSymbol(symbol: number): Reference;
  getBlock(symbol: number): Nullable<ScopeBlock>;
  getDebuggerScope(): Nullable<Dict<ScopeSlot>>;
  bind(symbol: number, value: ScopeSlot): void;
  bindSelf(self: Reference): void;
  bindSymbol(symbol: number, value: Reference): void;
  bindBlock(symbol: number, value: Nullable<ScopeBlock>): void;
  bindDebuggerScope(map: Nullable<Dict<ScopeSlot>>): void;
  child(): Scope;
}

export interface DynamicScope {
  get(key: string): Reference<unknown>;
  set(key: string, reference: Reference<unknown>): Reference<unknown>;
  child(): DynamicScope;
}
