import { SimpleDocument } from '@simple-dom/interface';
import { ComponentInstanceState } from '../components';
import { ComponentManager } from '../components/component-manager';
import { Option } from '../core';
import { GlimmerTreeChanges, GlimmerTreeConstruction } from '../dom/changes';
import { DebugRenderTree } from './debug-render-tree';
import { ModifierManager } from './modifier';
import { Owner } from './owner';

export interface EnvironmentOptions {
  document?: SimpleDocument;
  appendOperations?: GlimmerTreeConstruction;
  updateOperations?: GlimmerTreeChanges;
}

export type InternalComponent = ComponentInstanceState;
export type InternalComponentManager = ComponentManager<ComponentInstanceState>;

export interface Transaction {}

declare const TransactionSymbol: unique symbol;
export type TransactionSymbol = typeof TransactionSymbol;

export interface Environment<O extends Owner = Owner> {
  [TransactionSymbol]: Option<Transaction>;

  didCreate(component: InternalComponent, manager: InternalComponentManager): void;
  didUpdate(component: unknown, manager: ComponentManager<unknown>): void;

  scheduleInstallModifier(modifier: unknown, manager: ModifierManager): void;
  scheduleUpdateModifier(modifier: unknown, manager: ModifierManager): void;

  begin(): void;
  commit(): void;

  getDOM(): GlimmerTreeChanges;
  getAppendOperations(): GlimmerTreeConstruction;

  isInteractive: boolean;
  debugRenderTree: DebugRenderTree;
  owner: O;
}
