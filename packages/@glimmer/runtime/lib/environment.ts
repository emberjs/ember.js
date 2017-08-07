import { VersionedPathReference } from '@glimmer/reference';

import { Constants, LazyConstants } from './environment/constants';

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

import { Macros } from './syntax/macros';
import { IArguments } from './vm/arguments';
import { DEBUG } from "@glimmer/local-debug-flags";
import { Simple, Unique, Resolver, BlockSymbolTable, Recast } from "@glimmer/interfaces";
import { Component, ComponentManager } from "./internal-interfaces";
import { TemplateMeta } from "@glimmer/wire-format";

export type ScopeBlock = [Handle, BlockSymbolTable];
export type ScopeSlot = VersionedPathReference<Opaque> | Option<ScopeBlock>;

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
    this.set<VersionedPathReference<Opaque>>(symbol, value);
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

export type Handle = Unique<"Handle">;

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
    return handle as Recast<number, Handle>;
  }

  finishMalloc(handle: Handle): void {
    let start = this.table[handle as Recast<Handle, number>];
    let finish = this.offset;
    this.table[(handle as Recast<Handle, number>) + 1] = finish - start;
  }

  size(): number {
    return this.offset;
  }

  // It is illegal to close over this address, as compaction
  // may move it. However, it is legal to use this address
  // multiple times between compactions.
  getaddr(handle: Handle): number {
    return this.table[handle as Recast<Handle, number>];
  }

  gethandle(address: number): Handle {
    this.table.push(address, 0, TableSlotState.Pointer);
    let handle = this.handle;
    this.handle += 3;
    return handle as Recast<number, Handle>;
  }

  sizeof(handle: Handle): number {
    if (DEBUG) {
      return this.table[(handle as Recast<Handle, number>) + 1];
    }
    return -1;
  }

  free(handle: Handle): void {
    this.table[(handle as Recast<Handle, number>) + 2] = 1;
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

  constructor(resolver: Resolver<any>) {
    this.heap = new Heap();
    this._opcode = new Opcode(this.heap);
    this.constants = new LazyConstants(resolver);
  }

  opcode(offset: number): Opcode {
    this._opcode.offset = offset;
    return this._opcode;
  }
}

export interface CompilationOptions<T extends TemplateMeta, Specifier, R extends Resolver<Specifier, T>> {
  resolver: R;
  program: Program;
  macros: Macros;
}

export abstract class Environment {
  protected updateOperations: DOMChanges;
  protected appendOperations: DOMTreeConstruction;
  private _transaction: Option<Transaction> = null;

  constructor({ appendOperations, updateOperations }: { appendOperations: DOMTreeConstruction, updateOperations: DOMChanges }) {
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

export default Environment;

export interface Helper {
  (vm: PublicVM, args: IArguments): VersionedPathReference<Opaque>;
}
