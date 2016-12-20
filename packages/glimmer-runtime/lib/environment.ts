import { SymbolTable } from 'glimmer-interfaces';

import { Blocks, Inlines, populateBuiltins } from './syntax/functions';

import * as Simple from './dom/interfaces';
import { DOMChanges, DOMTreeConstruction } from './dom/helper';
import { Reference, PathReference, OpaqueIterable } from 'glimmer-reference';
import { UNDEFINED_REFERENCE, ConditionalReference } from './references';
import {
  defaultManagers,
  AttributeManager
} from './dom/attribute-managers';

import {
  PartialDefinition
} from './partial';

type Q = Record<string, string>;

import {
  Component,
  ComponentManager,
  ComponentDefinition
} from './component/interfaces';

import {
  ModifierManager
} from './modifier/interfaces';

import {
  Option,
  Destroyable,
  Opaque,
  HasGuid,
  ensureGuid,
  expect,
  assert
} from 'glimmer-util';

import {
  TemplateMeta
} from 'glimmer-wire-format';

import { EvaluatedArgs } from './compiled/expressions/args';

import { InlineBlock } from './scanner';

import { PublicVM } from './vm/append';

export type ScopeSlot = PathReference<Opaque> | InlineBlock | EvaluatedArgs;

export interface DynamicScope {
  get(key: string): PathReference<Opaque>;
  set(key: string, reference: PathReference<Opaque>): PathReference<Opaque>;
  child(): DynamicScope;
}

export class Scope {
  static root(self: PathReference<Opaque>, size = 0) {
    let refs: PathReference<Opaque>[] = new Array(size + 1);

    for (let i = 0; i <= size; i++) {
      refs[i] = UNDEFINED_REFERENCE;
    }

    return new Scope(refs).init({ self });
  }

  // the 0th slot is `self`
  private slots: ScopeSlot[];
  private callerScope: Option<Scope> = null;

  constructor(references: ScopeSlot[], callerScope: Option<Scope> = null) {
    this.slots = references;
    this.callerScope = callerScope;
  }

  init({ self }: { self: PathReference<Opaque> }): this {
    this.slots[0] = self;
    return this;
  }

  getSelf(): PathReference<Opaque> {
    return this.slots[0] as PathReference<Opaque>;
  }

  getSymbol(symbol: number): PathReference<Opaque> {
    return this.slots[symbol] as PathReference<Opaque>;
  }

  getBlock(symbol: number): InlineBlock {
    return this.slots[symbol] as InlineBlock;
  }

  getPartialArgs(symbol: number): EvaluatedArgs {
    return this.slots[symbol] as EvaluatedArgs;
  }

  bindSymbol(symbol: number, value: PathReference<Opaque>) {
    this.slots[symbol] = value;
  }

  bindBlock(symbol: number, value: InlineBlock) {
    this.slots[symbol] = value;
  }

  bindPartialArgs(symbol: number, value: EvaluatedArgs) {
    this.slots[symbol] = value;
  }

  bindCallerScope(scope: Scope) {
    this.callerScope = scope;
  }

  getCallerScope(): Option<Scope> {
    return this.callerScope;
  }

  child(): Scope {
    return new Scope(this.slots.slice(), this.callerScope);
  }
}

class Transaction {
  public scheduledInstallManagers: ModifierManager<Opaque>[] = [];
  public scheduledInstallModifiers: Object[] = [];
  public scheduledUpdateModifierManagers: ModifierManager<Opaque>[] = [];
  public scheduledUpdateModifiers: Object[] = [];
  public createdComponents: Component[] = [];
  public createdManagers: ComponentManager<Component>[] = [];
  public updatedComponents: Component[] = [];
  public updatedManagers: ComponentManager<Component>[] = [];
  public destructors: Destroyable[] = [];

  didCreate<T>(component: T, manager: ComponentManager<T>) {
    this.createdComponents.push(component);
    this.createdManagers.push(manager);
  }

  didUpdate<T>(component: T, manager: ComponentManager<T>) {
    this.updatedComponents.push(component);
    this.updatedManagers.push(manager);
  }

  scheduleInstallModifier<T>(modifier: T, manager: ModifierManager<T>) {
    this.scheduledInstallManagers.push(manager);
    this.scheduledInstallModifiers.push(modifier);
  }

  scheduleUpdateModifier<T>(modifier: T, manager: ModifierManager<T>) {
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

export abstract class Environment {
  protected updateOperations: DOMChanges;
  protected appendOperations: DOMTreeConstruction;
  private _macros: Option<{ blocks: Blocks, inlines: Inlines }> = null;
  private _transaction: Option<Transaction> = null;

  constructor({ appendOperations, updateOperations }: { appendOperations: DOMTreeConstruction, updateOperations: DOMChanges }) {
    this.appendOperations = appendOperations;
    this.updateOperations = updateOperations;
  }

  toConditionalReference(reference: Reference<Opaque>): Reference<boolean> {
    return new ConditionalReference(reference);
  }

  abstract iterableFor(reference: Reference<Opaque>, args: EvaluatedArgs): OpaqueIterable;
  abstract protocolForURL(s: string): string;

  getAppendOperations(): DOMTreeConstruction { return this.appendOperations; }
  getDOM(): DOMChanges { return this.updateOperations; }

  getIdentity(object: HasGuid): string {
    return ensureGuid(object) + '';
  }

  begin() {
    assert(!this._transaction, 'Cannot start a nested transaction');
    this._transaction = new Transaction();
  }

  private get transaction(): Transaction {
    return expect(this._transaction, 'must be in a transaction');
  }

  didCreate<T>(component: T, manager: ComponentManager<T>) {
    this.transaction.didCreate(component, manager);
  }

  didUpdate<T>(component: T, manager: ComponentManager<T>) {
    this.transaction.didUpdate(component, manager);
  }

  scheduleInstallModifier<T>(modifier: T, manager: ModifierManager<T>) {
    this.transaction.scheduleInstallModifier(modifier, manager);
  }

  scheduleUpdateModifier<T>(modifier: T, manager: ModifierManager<T>) {
    this.transaction.scheduleUpdateModifier(modifier, manager);
  }

  didDestroy(d: Destroyable) {
    this.transaction.didDestroy(d);
  }

  commit() {
    this.transaction.commit();
    this._transaction = null;
  }

  attributeFor(element: Simple.Element, attr: string, isTrusting: boolean, namespace?: string): AttributeManager {
    return defaultManagers(element, attr, isTrusting, namespace === undefined ? null : namespace);
  }

  macros(): { blocks: Blocks, inlines: Inlines } {
    let macros = this._macros;
    if (!macros) {
      this._macros = macros = populateBuiltins();
    }

    return macros;
  }

  abstract hasHelper(helperName: Option<string>[], blockMeta: TemplateMeta): boolean;
  abstract lookupHelper(helperName: Option<string>[], blockMeta: TemplateMeta): Helper;

  abstract hasModifier(modifierName: string[], blockMeta: TemplateMeta): boolean;
  abstract lookupModifier(modifierName: string[], blockMeta: TemplateMeta): ModifierManager<Opaque>;

  abstract hasComponentDefinition(tagName: string[], symbolTable: SymbolTable): boolean;
  abstract getComponentDefinition(tagName: string[], symbolTable: SymbolTable): ComponentDefinition<Opaque>;

  abstract hasPartial(partialName: string, symbolTable: SymbolTable): boolean;
  abstract lookupPartial(PartialName: string, symbolTable: SymbolTable): PartialDefinition<TemplateMeta>;
}

export default Environment;

export interface Helper {
  (vm: PublicVM, args: EvaluatedArgs, symbolTable: SymbolTable): PathReference<Opaque>;
}
