import { SimpleDocument } from '@simple-dom/interface';
import { ComponentDefinitionState, ComponentInstance, ComponentInstanceState } from '../components';
import { Option } from '../core';
import { GlimmerTreeChanges, GlimmerTreeConstruction } from '../dom/changes';
import { DebugRenderTree } from './debug-render-tree';
import { Owner } from './owner';
import { ModifierInstance } from './modifier';
import { WithCreateInstance } from '../..';

export interface EnvironmentOptions {
  document?: SimpleDocument;
  appendOperations?: GlimmerTreeConstruction;
  updateOperations?: GlimmerTreeChanges;
}

export interface Transaction {}

declare const TransactionSymbol: unique symbol;
export type TransactionSymbol = typeof TransactionSymbol;

export type ComponentInstanceWithCreate = ComponentInstance<
  ComponentDefinitionState,
  ComponentInstanceState,
  WithCreateInstance
>;

export interface Environment {
  [TransactionSymbol]: Option<Transaction>;

  didCreate(component: ComponentInstanceWithCreate): void;
  didUpdate(component: ComponentInstanceWithCreate): void;

  scheduleInstallModifier(modifier: ModifierInstance): void;
  scheduleUpdateModifier(modifier: ModifierInstance): void;

  begin(): void;
  commit(): void;

  getDOM(): GlimmerTreeChanges;
  getAppendOperations(): GlimmerTreeConstruction;

  isInteractive: boolean;
  debugRenderTree?: DebugRenderTree;
}
