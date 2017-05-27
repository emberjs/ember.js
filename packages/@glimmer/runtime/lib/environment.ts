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
import { DEBUG } from "@glimmer/local-debug-flags";

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
  constructor(private heap: Heap) {}

  get type() {
    return this.heap.getbyaddr(this.offset);
  }

  get op1() {
    return this.heap.getbyaddr(this.offset + 1);
  }

  get op2() {
    return this.heap.getbyaddr(this.offset + 2);
  }

  get op3() {
    return this.heap.getbyaddr(this.offset + 3);
  }
}

export interface Handle {
  "[is-handle]": true;
}

type unsafe = any;

enum TableSlotState {
  Allocated,
  Freed,
  Purged,
  Pointer
}

export class Heap {
  private heap: number[] = [];
  private offset = 0;
  private handle = 0;

  /**
   * layout:
   *
   * - pointer into heap
   * - size
   * - freed (0 or 1)
   */
  private table: number[] = [];

  push(item: number): void {
    this.heap[this.offset++] = item;
  }

  getbyaddr(address: number): number {
    return this.heap[address];
  }

  setbyaddr(address: number, value: number) {
    this.heap[address] = value;
  }

  malloc(): Handle {
    this.table.push(this.offset, 0, 0);
    let handle = this.handle;
    this.handle += 3;
    return handle as unsafe as Handle;
  }

  finishMalloc(handle: Handle): void {
    let start = this.table[handle as unsafe as number];
    let finish = this.offset;
    this.table[(handle as unsafe as number) + 1] = finish - start;
  }

  size(): number {
    return this.offset;
  }

  // It is illegal to close over this address, as compaction
  // may move it. However, it is legal to use this address
  // multiple times between compactions.
  getaddr(handle: Handle): number {
    return this.table[handle as unsafe as number];
  }

  gethandle(address: number): Handle {
    this.table.push(address, 0, TableSlotState.Pointer);
    let handle = this.handle;
    this.handle += 3;
    return handle as unsafe as Handle;
  }

  sizeof(handle: Handle): number {
    if (DEBUG) {
      return this.table[(handle as unsafe as number) + 1];
    }
    return -1;
  }

  free(handle: Handle): void {
    this.table[(handle as unsafe as number) + 2] = 1;
  }

  compact(): void {
    let compactedSize = 0;
    let { table, table: { length }, heap } = this;

    for (let i=0; i<length; i+=3) {
      let offset = table[i];
      let size = table[i + 1];
      let state = table[i + 2];

      if (state === TableSlotState.Purged) {
        continue;
      } else if (state === TableSlotState.Freed) {
        // transition to "already freed"
        // a good improvement would be to reuse
        // these slots
        table[i + 2] = 2;
        compactedSize += size;
      } else if (state === TableSlotState.Allocated) {
        for (let j=offset; j<=i+size; j++) {
          heap[j - compactedSize] = heap[j];
        }

        table[i] = offset - compactedSize;
      } else if (state === TableSlotState.Pointer) {
        table[i] = offset - compactedSize;
      }
    }

    this.offset = this.offset - compactedSize;
  }
}

export class Program {
  [key: number]: never;

  private _opcode: Opcode;
  public constants: Constants;
  public heap: Heap;

  constructor() {
    this.heap = new Heap();
    this._opcode = new Opcode(this.heap);
    this.constants = new Constants();
  }

  opcode(offset: number): Opcode {
    this._opcode.offset = offset;
    return this._opcode;
  }
}

export abstract class Environment {
  protected updateOperations: DOMChanges;
  protected appendOperations: DOMTreeConstruction;
  private _macros: Option<{ blocks: Blocks, inlines: Inlines }> = null;
  private _transaction: Option<Transaction> = null;
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
    assert(!this._transaction, 'a glimmer transaction was begun, but one already exists. You may have a nested transaction');
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
    let transaction = this.transaction;
    this._transaction = null;
    transaction.commit();
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
