import { SimpleDocument } from '@simple-dom/interface';
import { ComponentInstanceState } from '../components';
import { InternalComponentManager, InternalModifierManager } from '../managers';
import { Option } from '../core';
import { GlimmerTreeChanges, GlimmerTreeConstruction } from '../dom/changes';
import { DebugRenderTree } from './debug-render-tree';
import { Owner } from './owner';

export interface EnvironmentOptions {
  document?: SimpleDocument;
  appendOperations?: GlimmerTreeConstruction;
  updateOperations?: GlimmerTreeChanges;
}

export interface Transaction {}

declare const TransactionSymbol: unique symbol;
export type TransactionSymbol = typeof TransactionSymbol;

export interface Environment<O extends Owner = Owner> {
  [TransactionSymbol]: Option<Transaction>;

  didCreate(component: ComponentInstanceState, manager: InternalComponentManager): void;
  didUpdate(component: ComponentInstanceState, manager: InternalComponentManager): void;

  scheduleInstallModifier(modifier: unknown, manager: InternalModifierManager): void;
  scheduleUpdateModifier(modifier: unknown, manager: InternalModifierManager): void;

  begin(): void;
  commit(): void;

  getDOM(): GlimmerTreeChanges;
  getAppendOperations(): GlimmerTreeConstruction;

  isInteractive: boolean;
  debugRenderTree?: DebugRenderTree;
  owner: O;
}
