import { OpaqueIterable, VersionedPathReference, VersionedReference } from '@glimmer/reference';
import { AttributeOperation } from '@glimmer/runtime';
import { AttrNamespace, SimpleElement } from '@simple-dom/interface';
import { ComponentDefinitionState, ComponentInstanceState } from '../components';
import { ComponentManager } from '../components/component-manager';
import { Drop, Option } from '../core';
import { GlimmerTreeChanges, GlimmerTreeConstruction } from '../dom/changes';
import { ModifierManager } from './modifier';
import { Cursor } from '../dom/bounds';

export interface EnvironmentOptions {
  appendOperations: GlimmerTreeConstruction;
  updateOperations: GlimmerTreeChanges;
}

export type InternalComponent = ComponentInstanceState;
export type InternalComponentManager = ComponentManager<ComponentInstanceState>;

export interface Transaction {}

declare const TransactionSymbol: 'TRANSACTION [c3938885-aba0-422f-b540-3fd3431c78b5]';
export type TransactionSymbol = typeof TransactionSymbol;

export interface Environment {
  [TransactionSymbol]: Option<Transaction>;

  didCreate(component: InternalComponent, manager: InternalComponentManager): void;
  didUpdate(component: unknown, manager: ComponentManager<unknown>): void;
  didDestroy(drop: Drop): void;

  scheduleInstallModifier(modifier: unknown, manager: ModifierManager): void;
  scheduleUpdateModifier(modifier: unknown, manager: ModifierManager): void;

  begin(): void;
  commit(): void;

  getDOM(): GlimmerTreeChanges;
  protocolForURL(s: string): string;
  attributeFor(
    element: SimpleElement,
    attr: string,
    isTrusting: boolean,
    namespace: Option<AttrNamespace>
  ): AttributeOperation;
  getAppendOperations(): GlimmerTreeConstruction;

  iterableFor(reference: VersionedReference<unknown>, key: unknown): OpaqueIterable;
  toConditionalReference(reference: VersionedReference<unknown>): VersionedReference<boolean>;
}

export interface DynamicScope {
  get(key: string): VersionedPathReference<unknown>;
  set(key: string, reference: VersionedPathReference<unknown>): VersionedPathReference<unknown>;
  child(): DynamicScope;
}
