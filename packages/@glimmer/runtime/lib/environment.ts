import { VersionedPathReference } from '@glimmer/reference';

import { DOMChanges, DOMTreeConstruction } from './dom/helper';
import { Reference, OpaqueIterable } from '@glimmer/reference';
import { UNDEFINED_REFERENCE, ConditionalReference } from './references';
import { DynamicAttributeFactory, defaultDynamicAttributes } from './vm/attributes/dynamic';

import {
  ModifierManager, Modifier
} from './modifier/interfaces';

import {
  Dict,
  Option,
  Destroyable,
  Opaque,
  HasGuid,
  assert,
  ensureGuid,
  expect
} from '@glimmer/util';

import { PublicVM } from './vm/append';

import { Macros, OpcodeBuilderConstructor, ICompilableTemplate } from "@glimmer/opcode-compiler";
import { IArguments } from './vm/arguments';
import { Simple, RuntimeResolver, BlockSymbolTable, VMHandle } from "@glimmer/interfaces";
import { Component, ComponentManager } from "./internal-interfaces";
import { Program } from "@glimmer/program";

export type ScopeBlock = [VMHandle | ICompilableTemplate<BlockSymbolTable>, BlockSymbolTable];
export type ScopeSlot = Option<VersionedPathReference<Opaque>> | Option<ScopeBlock>;

export interface DynamicScope {
  get(key: string): VersionedPathReference<Opaque>;
  set(key: string, reference: VersionedPathReference<Opaque>): VersionedPathReference<Opaque>;
  child(): DynamicScope;
}

export class Scope {
  static root(self: VersionedPathReference<Opaque>, size = 0) {
    let refs: VersionedPathReference<Opaque>[] = new Array(size + 1);

    for (let i = 0; i <= size; i++) {
      refs[i] = UNDEFINED_REFERENCE;
    }

    return new Scope(refs, null, null, null).init({ self });
  }

  static sized(size = 0) {
    let refs: VersionedPathReference<Opaque>[] = new Array(size + 1);

    for (let i = 0; i <= size; i++) {
      refs[i] = UNDEFINED_REFERENCE;
    }

    return new Scope(refs, null, null, null);
  }

  constructor(
    // the 0th slot is `self`
    private slots: ScopeSlot[],
    private callerScope: Option<Scope>,
    // named arguments and blocks passed to a layout that uses eval
    private evalScope: Option<Dict<ScopeSlot>>,
    // locals in scope when the partial was invoked
    private partialMap: Option<Dict<VersionedPathReference<Opaque>>>) {
  }

  init({ self }: { self: VersionedPathReference<Opaque> }): this {
    this.slots[0] = self;
    return this;
  }

  getSelf(): VersionedPathReference<Opaque> {
    return this.get<VersionedPathReference<Opaque>>(0);
  }

  getSymbol(symbol: number): VersionedPathReference<Opaque> {
    return this.get<VersionedPathReference<Opaque>>(symbol);
  }

  getBlock(symbol: number): ScopeBlock {
    return this.get<ScopeBlock>(symbol);
  }

  getEvalScope(): Option<Dict<ScopeSlot>> {
    return this.evalScope;
  }

  getPartialMap(): Option<Dict<VersionedPathReference<Opaque>>> {
    return this.partialMap;
  }

  bind(symbol: number, value: ScopeSlot) {
    this.set(symbol, value);
  }

  bindSelf(self: VersionedPathReference<Opaque>) {
    this.set<VersionedPathReference<Opaque>>(0, self);
  }

  bindSymbol(symbol: number, value: VersionedPathReference<Opaque>) {
    this.set(symbol, value);
  }

  bindBlock(symbol: number, value: Option<ScopeBlock>) {
    this.set<Option<ScopeBlock>>(symbol, value);
  }

  bindEvalScope(map: Option<Dict<ScopeSlot>>) {
    this.evalScope = map;
  }

  bindPartialMap(map: Dict<VersionedPathReference<Opaque>>) {
    this.partialMap = map;
  }

  bindCallerScope(scope: Option<Scope>) {
    this.callerScope = scope;
  }

  getCallerScope(): Option<Scope> {
    return this.callerScope;
  }

  child(): Scope {
    return new Scope(this.slots.slice(), this.callerScope, this.evalScope, this.partialMap);
  }

  private get<T extends ScopeSlot>(index: number): T {
    if (index >= this.slots.length) {
      throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
    }

    return this.slots[index] as T;
  }

  private set<T extends ScopeSlot>(index: number, value: T): void {
    if (index >= this.slots.length) {
      throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
    }

    this.slots[index] = value;
  }
}

class Transaction {
  public scheduledInstallManagers: ModifierManager[] = [];
  public scheduledInstallModifiers: Modifier[] = [];
  public scheduledUpdateModifierManagers: ModifierManager[] = [];
  public scheduledUpdateModifiers: Modifier[] = [];
  public createdComponents: Component[] = [];
  public createdManagers: ComponentManager[] = [];
  public updatedComponents: Component[] = [];
  public updatedManagers: ComponentManager[] = [];
  public destructors: Destroyable[] = [];

  didCreate(component: Component, manager: ComponentManager) {
    this.createdComponents.push(component);
    this.createdManagers.push(manager);
  }

  didUpdate(component: Component, manager: ComponentManager) {
    this.updatedComponents.push(component);
    this.updatedManagers.push(manager);
  }

  scheduleInstallModifier(modifier: Modifier, manager: ModifierManager) {
    this.scheduledInstallManagers.push(manager);
    this.scheduledInstallModifiers.push(modifier);
  }

  scheduleUpdateModifier(modifier: Modifier, manager: ModifierManager) {
    this.scheduledUpdateModifierManagers.push(manager);
    this.scheduledUpdateModifiers.push(modifier);
  }

  didDestroy(d: Destroyable) {
    this.destructors.push(d);
  }

  commit() {
    let { createdComponents, createdManagers } = this;

    for (let i=0; i<createdComponents.length; i++) {
      let component = createdComponents[i];
      let manager = createdManagers[i];
      manager.didCreate(component);
    }

    let { updatedComponents, updatedManagers } = this;

    for (let i=0; i<updatedComponents.length; i++) {
      let component = updatedComponents[i];
      let manager = updatedManagers[i];
      manager.didUpdate(component);
    }

    let { destructors } = this;

    for (let i=0; i<destructors.length; i++) {
      destructors[i].destroy();
    }

    let { scheduledInstallManagers, scheduledInstallModifiers } = this;

    for (let i = 0; i < scheduledInstallManagers.length; i++) {
      let manager = scheduledInstallManagers[i];
      let modifier = scheduledInstallModifiers[i];
      manager.install(modifier);
    }

    let { scheduledUpdateModifierManagers, scheduledUpdateModifiers } = this;

    for (let i = 0; i < scheduledUpdateModifierManagers.length; i++) {
      let manager = scheduledUpdateModifierManagers[i];
      let modifier = scheduledUpdateModifiers[i];
      manager.update(modifier);
    }
  }
}

export interface CompilationOptions<Specifier, R extends RuntimeResolver<Specifier>> {
  resolver: R;
  program: Program<Specifier>;
  macros: Macros;
  Builder: OpcodeBuilderConstructor;
}

export interface EnvironmentOptions {
  appendOperations: DOMTreeConstruction;
  updateOperations: DOMChanges;
}

export abstract class Environment {
  protected updateOperations: DOMChanges;
  protected appendOperations: DOMTreeConstruction;
  private _transaction: Option<Transaction> = null;

  constructor({ appendOperations, updateOperations }: EnvironmentOptions) {
    this.appendOperations = appendOperations;
    this.updateOperations = updateOperations;
  }

  toConditionalReference(reference: Reference): Reference<boolean> {
    return new ConditionalReference(reference);
  }

  abstract iterableFor(reference: Reference, key: string): OpaqueIterable;
  abstract protocolForURL(s: string): string;

  getAppendOperations(): DOMTreeConstruction { return this.appendOperations; }
  getDOM(): DOMChanges { return this.updateOperations; }

  getIdentity(object: HasGuid): string {
    return ensureGuid(object) + '';
  }

  begin() {
    assert(!this._transaction, 'a glimmer transaction was begun, but one already exists. You may have a nested transaction');
    this._transaction = new Transaction();
  }

  private get transaction(): Transaction {
    return expect(this._transaction!, 'must be in a transaction');
  }

  didCreate(component: Component, manager: ComponentManager) {
    this.transaction.didCreate(component, manager);
  }

  didUpdate(component: Component, manager: ComponentManager) {
    this.transaction.didUpdate(component, manager);
  }

  scheduleInstallModifier(modifier: Modifier, manager: ModifierManager) {
    this.transaction.scheduleInstallModifier(modifier, manager);
  }

  scheduleUpdateModifier(modifier: Modifier, manager: ModifierManager) {
    this.transaction.scheduleUpdateModifier(modifier, manager);
  }

  didDestroy(d: Destroyable) {
    this.transaction.didDestroy(d);
  }

  commit() {
    let transaction = this.transaction;
    this._transaction = null;
    transaction.commit();
  }

  attributeFor(element: Simple.Element, attr: string, _isTrusting: boolean, _namespace: Option<string> = null): DynamicAttributeFactory {
    return defaultDynamicAttributes(element, attr);
  }
}

export abstract class DefaultEnvironment extends Environment {
  constructor(options?: EnvironmentOptions) {
    if (!options) {
      let document = window.document;
      let appendOperations = new DOMTreeConstruction(document);
      let updateOperations = new DOMChanges(document as HTMLDocument);
      options = { appendOperations, updateOperations };
    }

    super(options);
  }
}

export default Environment;

export interface Helper {
  (vm: PublicVM, args: IArguments): VersionedPathReference<Opaque>;
}
