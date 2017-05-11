import { VersionedPathReference } from '@glimmer/reference';
import { Blocks, Inlines, populateBuiltins } from './syntax/functions';

import { Constants } from './environment/constants';

import * as Simple from './dom/interfaces';
import { DOMChanges, DOMTreeConstruction } from './dom/helper';
import { Reference, OpaqueIterable } from '@glimmer/reference';
import { UNDEFINED_REFERENCE, ConditionalReference } from './references';
import {
  defaultManagers,
  AttributeManager
} from './dom/attribute-managers';

import {
  PartialDefinition
} from './partial';

import {
  Component,
  ComponentManager,
  ComponentDefinition
} from './component/interfaces';

import {
  ModifierManager
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

import {
  TemplateMeta
} from '@glimmer/wire-format';

import { Block } from './syntax/interfaces';

import { PublicVM } from './vm/append';

import { IArguments } from './vm/arguments';

export type ScopeSlot = VersionedPathReference<Opaque> | Option<Block>;

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

  getBlock(symbol: number): Block {
    return this.get<Block>(symbol);
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
    this.set<VersionedPathReference<Opaque>>(symbol, value);
  }

  bindBlock(symbol: number, value: Option<Block>) {
    this.set<Option<Block>>(symbol, value);
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

  private get<T>(index: number): T {
    if (index >= this.slots.length) {
      throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
    }

    return this.slots[index] as any as T;
  }

  private set<T>(index: number, value: T): void {
    if (index >= this.slots.length) {
      throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
    }

    this.slots[index] = value as any;
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

export class Opcode {
  public offset = 0;
  constructor(private array: Uint32Array | Array<number>) {}

  get type() {
    return this.array[this.offset];
  }

  get op1() {
    return this.array[this.offset + 1];
  }

  get op2() {
    return this.array[this.offset + 2];
  }

  get op3() {
    return this.array[this.offset + 3];
  }
}

export class Program {
  [key: number]: never;

  private opcodes: number[] = [];
  private _offset = 0;
  private _opcode: Opcode;

  constructor() {
    this._opcode = new Opcode(this.opcodes);
  }

  get next(): number {
    return this._offset;
  }

  get current(): number {
    return this._offset - 4;
  }

  opcode(offset: number): Opcode {
    this._opcode.offset = offset;
    return this._opcode;
  }

  set(pos: number, type: number, op1 = 0, op2 = 0, op3 = 0) {
    this.opcodes[pos] = type;
    this.opcodes[pos + 1] = op1;
    this.opcodes[pos + 2] = op2;
    this.opcodes[pos + 3] = op3;
  }

  push(type: number, op1 = 0, op2 = 0, op3 = 0): number {
    let offset = this._offset;
    this.opcodes[this._offset++] = type;
    this.opcodes[this._offset++] = op1;
    this.opcodes[this._offset++] = op2;
    this.opcodes[this._offset++] = op3;
    return offset;
  }
}

export abstract class Environment {
  protected updateOperations: DOMChanges;
  protected appendOperations: DOMTreeConstruction;
  private _macros: Option<{ blocks: Blocks, inlines: Inlines }> = null;
  private _transaction: Option<Transaction> = null;
  public constants: Constants = new Constants();
  public program = new Program();

  constructor({ appendOperations, updateOperations }: { appendOperations: DOMTreeConstruction, updateOperations: DOMChanges }) {
    this.appendOperations = appendOperations;
    this.updateOperations = updateOperations;
  }

  toConditionalReference(reference: Reference<Opaque>): Reference<boolean> {
    return new ConditionalReference(reference);
  }

  abstract iterableFor(reference: Reference<Opaque>, key: string): OpaqueIterable;
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
    return expect(this._transaction!, 'must be in a transaction');
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
      this._macros = macros = this.populateBuiltins();
    }

    return macros;
  }

  populateBuiltins(): { blocks: Blocks, inlines: Inlines } {
    return populateBuiltins();
  }

  abstract hasHelper(helperName: string, meta: TemplateMeta): boolean;
  abstract lookupHelper(helperName: string, meta: TemplateMeta): Helper;

  abstract hasModifier(modifierName: string, meta: TemplateMeta): boolean;
  abstract lookupModifier(modifierName: string, meta: TemplateMeta): ModifierManager<Opaque>;

  abstract hasComponentDefinition(tagName: string, meta: TemplateMeta): boolean;
  abstract getComponentDefinition(tagName: string, meta: TemplateMeta): ComponentDefinition<Opaque>;

  abstract hasPartial(partialName: string, meta: TemplateMeta): boolean;
  abstract lookupPartial(PartialName: string, meta: TemplateMeta): PartialDefinition<TemplateMeta>;
}

export default Environment;

export interface Helper {
  (vm: PublicVM, args: IArguments): VersionedPathReference<Opaque>;
}
