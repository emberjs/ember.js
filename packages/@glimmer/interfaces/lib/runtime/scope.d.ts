import { CompilableBlock } from '../template';
// eslint-disable-next-line node/no-extraneous-import
import { Reference } from '@glimmer/reference';
import { Option, Dict } from '../core';
import { BlockSymbolTable } from '../tier1/symbol-table';

export type JitOrAotBlock = CompilableBlock | number;

export type JitScopeBlock = [CompilableBlock, Scope<CompilableBlock>, BlockSymbolTable];
export type JitBlockValue = JitScopeBlock[0 | 1 | 2];
export type JitScopeSlot = Option<Reference> | Option<JitScopeBlock>;

export type AotScopeBlock = [number, Scope<number>, BlockSymbolTable];
export type AotBlockValue = AotScopeBlock[0 | 1 | 2];
export type AotScopeSlot = Option<Reference> | Option<AotScopeBlock>;

export type ScopeBlock<C extends JitOrAotBlock = JitOrAotBlock> = C extends CompilableBlock
  ? JitScopeBlock
  : AotScopeBlock;

export type BlockValue<C extends JitOrAotBlock = JitOrAotBlock> = C extends CompilableBlock
  ? JitBlockValue
  : AotBlockValue;

export type ScopeSlot<C extends JitOrAotBlock = JitOrAotBlock> = Option<ScopeBlock<C> | Reference>;

export interface Scope<C extends JitOrAotBlock> {
  // for debug only
  readonly slots: Array<ScopeSlot<C>>;

  getSelf(): Reference;
  getSymbol(symbol: number): Reference;
  getBlock(symbol: number): Option<ScopeBlock<C>>;
  getEvalScope(): Option<Dict<ScopeSlot<C>>>;
  getPartialMap(): Option<Dict<Reference>>;
  bind(symbol: number, value: ScopeSlot<C>): void;
  bindSelf(self: Reference): void;
  bindSymbol(symbol: number, value: Reference): void;
  bindBlock(symbol: number, value: Option<ScopeBlock<C>>): void;
  bindEvalScope(map: Option<Dict<ScopeSlot<C>>>): void;
  bindPartialMap(map: Dict<Reference>): void;
  child(): Scope<C>;
}

export interface PartialScope<C extends JitOrAotBlock> extends Scope<C> {
  bindEvalScope(scope: Option<Dict<ScopeSlot<C>>>): void;
}

export interface DynamicScope {
  get(key: string): Reference<unknown>;
  set(key: string, reference: Reference<unknown>): Reference<unknown>;
  child(): DynamicScope;
}
