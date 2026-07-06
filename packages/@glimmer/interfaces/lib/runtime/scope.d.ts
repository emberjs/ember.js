import type { Nullable } from '../core.js';
import type { Reference } from '../references.js';
import type { CompilableBlock } from '../template.js';
import type { BlockSymbolTable } from '../tier1/symbol-table.js';
import type { Owner } from './owner.js';

export type Block = CompilableBlock | number;

export type ScopeBlock = [CompilableBlock, Scope, BlockSymbolTable];
export type BlockValue = ScopeBlock[0 | 1 | 2];
export type ScopeSlot = Reference | ScopeBlock | null;

export interface Scope {
  /**
   * A single program can mix and match multiple owners. This can happen component is curried from a
   * template with one owner and then rendered in a second owner.
   *
   * Note: Owners can change when new root scopes are created (including when rendering a
   * component), but not in child scopes.
   */
  readonly owner: Owner;
  // for debug only
  snapshot(): ScopeSlot[];

  getSelf(): Reference;
  getSymbol(symbol: number): Reference;
  getBlock(symbol: number): Nullable<ScopeBlock>;
  bind(symbol: number, value: ScopeSlot): void;
  bindSelf(self: Reference): void;
  bindSymbol(symbol: number, value: Reference): void;
  bindBlock(symbol: number, value: Nullable<ScopeBlock>): void;
  child(): Scope;
}

/**
 * A node in the render scope tree. Each component with the `renderScope`
 * capability gets a node, linked to the nearest enclosing node. Values
 * provided at a node are visible to that node's subtree via `readRenderScopeValue`.
 */
export interface RenderScopeNode {
  parent: Nullable<RenderScopeNode>;
  values: Nullable<Map<PropertyKey, unknown>>;
}

/**
 * Tracks the current render scope node for the environment's active render.
 * `push` creates a node during initial render; `enter`/`exit` re-establish
 * an existing node while the updating VM descends the tree.
 */
export interface RenderScopeStack {
  readonly current: Nullable<RenderScopeNode>;
  begin(): void;
  push(): RenderScopeNode;
  enter(node: RenderScopeNode): void;
  exit(): void;
}
