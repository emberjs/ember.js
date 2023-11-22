import type { SimpleDocument } from '@simple-dom/interface';

import type {
  ComponentDefinitionState,
  ComponentInstance,
  ComponentInstanceState,
} from '../components';
import type { Nullable } from '../core';
import type { GlimmerTreeChanges, GlimmerTreeConstruction } from '../dom/changes';
import type { WithCreateInstance } from '../managers';
import type { DebugRenderTree } from './debug-render-tree';
import type { ModifierInstance } from './modifier';

export interface EnvironmentOptions {
  document?: SimpleDocument;
  appendOperations?: GlimmerTreeConstruction;
  updateOperations?: GlimmerTreeChanges;
}

export type Transaction = object;

declare const TransactionSymbol: unique symbol;
export type TransactionSymbol = typeof TransactionSymbol;

export type ComponentInstanceWithCreate = ComponentInstance<
  ComponentDefinitionState,
  ComponentInstanceState,
  WithCreateInstance
>;

export interface Environment {
  [TransactionSymbol]: Nullable<Transaction>;

  didCreate(component: ComponentInstanceWithCreate): void;
  didUpdate(component: ComponentInstanceWithCreate): void;

  scheduleInstallModifier(modifier: ModifierInstance): void;
  scheduleUpdateModifier(modifier: ModifierInstance): void;

  begin(): void;
  commit(): void;

  getDOM(): GlimmerTreeChanges;
  getAppendOperations(): GlimmerTreeConstruction;

  isInteractive: boolean;
  debugRenderTree?: DebugRenderTree | undefined;
}
