import type { SimpleDocument } from '@simple-dom/interface';

import { type WithCreateInstance } from '../..';
import {
  type ComponentDefinitionState,
  type ComponentInstance,
  type ComponentInstanceState,
} from '../components';
import { type Option } from '../core';
import { type GlimmerTreeChanges, type GlimmerTreeConstruction } from '../dom/changes';
import { type DebugRenderTree } from './debug-render-tree';
import { type ModifierInstance } from './modifier';

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
  debugRenderTree?: DebugRenderTree | undefined;
}
