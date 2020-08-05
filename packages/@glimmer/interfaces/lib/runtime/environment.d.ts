import { VersionedPathReference, VersionedReference, IteratorDelegate } from '@glimmer/reference';
import { AttributeOperation } from '../dom/attributes';
import { AttrNamespace, SimpleElement, SimpleDocument } from '@simple-dom/interface';
import { ComponentInstanceState } from '../components';
import { ComponentManager } from '../components/component-manager';
import { Option } from '../core';
import { GlimmerTreeChanges, GlimmerTreeConstruction } from '../dom/changes';
import { ModifierManager } from './modifier';

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

export interface Environment<Extra = unknown> {
  [TransactionSymbol]: Option<Transaction>;

  didCreate(component: InternalComponent, manager: InternalComponentManager): void;
  didUpdate(component: unknown, manager: ComponentManager<unknown>): void;

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

  // Moving away from this, toward `toBool`
  toConditionalReference(reference: VersionedReference<unknown>): VersionedReference<boolean>;

  toBool(value: unknown): boolean;
  toIterator(value: unknown): Option<IteratorDelegate>;

  getProp(item: unknown, prop: string): unknown;
  getPath(item: unknown, path: string): unknown;
  setPath(item: unknown, path: string, value: unknown): unknown;

  getTemplatePathDebugContext(ref: VersionedPathReference): string;
  setTemplatePathDebugContext(
    ref: VersionedPathReference,
    desc: string,
    parentRef: Option<VersionedPathReference>
  ): void;

  isInteractive: boolean;
  extra: Extra;
}

export interface DynamicScope {
  get(key: string): VersionedPathReference<unknown>;
  set(key: string, reference: VersionedPathReference<unknown>): VersionedPathReference<unknown>;
  child(): DynamicScope;
}
