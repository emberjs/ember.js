import { CompilableBlock } from '../template';
import { VersionedPathReference } from '@glimmer/reference';
import { Option, Dict } from '../core';
import { BlockSymbolTable } from '../tier1/symbol-table';

export type JitOrAotBlock = CompilableBlock | number;

export type JitScopeBlock = [CompilableBlock, Scope<CompilableBlock>, BlockSymbolTable];
export type JitBlockValue = JitScopeBlock[0 | 1 | 2];
export type JitScopeSlot = Option<VersionedPathReference<unknown>> | Option<JitScopeBlock>;

export type AotScopeBlock = [number, Scope<number>, BlockSymbolTable];
export type AotBlockValue = AotScopeBlock[0 | 1 | 2];
export type AotScopeSlot = Option<VersionedPathReference<unknown>> | Option<AotScopeBlock>;

export type ScopeBlock<C extends JitOrAotBlock = JitOrAotBlock> = C extends CompilableBlock
  ? JitScopeBlock
  : AotScopeBlock;

export type BlockValue<C extends JitOrAotBlock = JitOrAotBlock> = C extends CompilableBlock
  ? JitBlockValue
  : AotBlockValue;

export type ScopeSlot<C extends JitOrAotBlock = JitOrAotBlock> = Option<
  ScopeBlock<C> | VersionedPathReference<unknown>
>;

export interface Scope<C extends JitOrAotBlock> {
  // for debug only
  readonly slots: Array<ScopeSlot<C>>;

  getSelf(): VersionedPathReference<unknown>;
  getSymbol(symbol: number): VersionedPathReference<unknown>;
  getBlock(symbol: number): Option<ScopeBlock<C>>;
  getEvalScope(): Option<Dict<ScopeSlot<C>>>;
  getPartialMap(): Option<Dict<VersionedPathReference<unknown>>>;
  bind(symbol: number, value: ScopeSlot<C>): void;
  bindSelf(self: VersionedPathReference<unknown>): void;
  bindSymbol(symbol: number, value: VersionedPathReference<unknown>): void;
  bindBlock(symbol: number, value: Option<ScopeBlock<C>>): void;
  bindEvalScope(map: Option<Dict<ScopeSlot<C>>>): void;
  bindPartialMap(map: Dict<VersionedPathReference<unknown>>): void;
  child(): Scope<C>;
}

export interface PartialScope<C extends JitOrAotBlock> extends Scope<C> {
  bindEvalScope(scope: Option<Dict<ScopeSlot<C>>>): void;
}
