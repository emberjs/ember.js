import { Statement as StatementSyntax } from './syntax';

import SymbolTable from './symbol-table';

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

import {
  Component,
  ComponentManager,
  ComponentDefinition
} from './component/interfaces';

import {
  ModifierManager
} from './modifier/interfaces';

import {
  Destroyable,
  Opaque,
  HasGuid,
  ensureGuid
} from 'glimmer-util';

import {
  TemplateMeta
} from 'glimmer-wire-format';

import { EvaluatedArgs } from './compiled/expressions/args';

import { InlineBlock } from './compiled/blocks';

import * as Syntax from './syntax/core';

import IfSyntax from './syntax/builtins/if';
import UnlessSyntax from './syntax/builtins/unless';
import WithSyntax from './syntax/builtins/with';
import EachSyntax from './syntax/builtins/each';

import { PublicVM } from './vm/append';

export type ScopeSlot = PathReference<Opaque> | InlineBlock;

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
  private callerScope: Scope = null;

  constructor(references: ScopeSlot[], callerScope: Scope = null) {
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

  bindSymbol(symbol: number, value: PathReference<Opaque>) {
    this.slots[symbol] = value;
  }

  bindBlock(symbol: number, value: InlineBlock) {
    this.slots[symbol] = value;
  }

  bindCallerScope(scope: Scope) {
    this.callerScope = scope;
  }

  getCallerScope(): Scope {
    return this.callerScope;
  }

  child(): Scope {
    return new Scope(this.slots.slice(), this.callerScope);
  }
}

export abstract class Environment {
  protected updateOperations: DOMChanges;
  protected appendOperations: DOMTreeConstruction;
  private scheduledInstallManagers: ModifierManager<Opaque>[] = null;
  private scheduledInstallModifiers: Object[] = null;
  private scheduledUpdateModifierManagers: ModifierManager<Opaque>[] = null;
  private scheduledUpdateModifiers: Object[] = null;
  private createdComponents: Component[] = null;
  private createdManagers: ComponentManager<Component>[] = null;
  private updatedComponents: Component[] = null;
  private updatedManagers: ComponentManager<Component>[] = null;
  private destructors: Destroyable[] = null;

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

  statement(statement: StatementSyntax, symbolTable: SymbolTable): StatementSyntax {
    return this.refineStatement(parseStatement(statement), symbolTable) || statement;
  }

  protected refineStatement(statement: ParsedStatement, symbolTable: SymbolTable): StatementSyntax {
    let {
      isSimple,
      isBlock,
      key,
      args,
    } = statement;

    if (isSimple && isBlock) {
      switch (key) {
        case 'each':
          return new EachSyntax(args);
        case 'if':
          return new IfSyntax(args);
        case 'with':
          return new WithSyntax(args);
        case 'unless':
          return new UnlessSyntax(args);
      }
    }
  }

  begin() {
    this.createdComponents = [];
    this.createdManagers = [];
    this.updatedComponents = [];
    this.updatedManagers = [];
    this.destructors = [];
    this.scheduledInstallManagers = [];
    this.scheduledInstallModifiers = [];
    this.scheduledUpdateModifierManagers = [];
    this.scheduledUpdateModifiers = [];
  }

  didCreate<T>(component: T, manager: ComponentManager<T>) {
    this.createdComponents.push(component as any);
    this.createdManagers.push(manager as any);
  }

  didUpdate<T>(component: T, manager: ComponentManager<T>) {
    this.updatedComponents.push(component as any);
    this.updatedManagers.push(manager as any);
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
    for (let i=0; i<this.createdComponents.length; i++) {
      let component = this.createdComponents[i];
      let manager = this.createdManagers[i];
      manager.didCreate(component);
    }

    for (let i=0; i<this.updatedComponents.length; i++) {
      let component = this.updatedComponents[i];
      let manager = this.updatedManagers[i];
      manager.didUpdate(component);
    }

    for (let i=0; i<this.destructors.length; i++) {
      this.destructors[i].destroy();
    }

    for (let i = 0; i < this.scheduledInstallManagers.length; i++) {
      let manager = this.scheduledInstallManagers[i];
      let modifier = this.scheduledInstallModifiers[i];
      manager.install(modifier);
    }

    for (let i = 0; i < this.scheduledUpdateModifierManagers.length; i++) {
      let manager = this.scheduledUpdateModifierManagers[i];
      let modifier = this.scheduledUpdateModifiers[i];
      manager.update(modifier);
    }

    this.createdComponents = null;
    this.createdManagers = null;
    this.updatedComponents = null;
    this.updatedManagers = null;
    this.destructors = null;
    this.scheduledInstallManagers = null;
    this.scheduledInstallModifiers = null;
    this.scheduledUpdateModifierManagers = null;
    this.scheduledUpdateModifiers = null;
  }

  attributeFor(element: Simple.Element, attr: string, isTrusting: boolean, namespace?: string): AttributeManager {
    return defaultManagers(element, attr, isTrusting, namespace);
  }

  abstract hasHelper(helperName: string[], blockMeta: TemplateMeta): boolean;
  abstract lookupHelper(helperName: string[], blockMeta: TemplateMeta): Helper;

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

export interface ParsedStatement {
  isSimple: boolean;
  path: string[];
  key: string;
  appendType: string;
  args: Syntax.Args;
  isInline: boolean;
  isBlock: boolean;
  isModifier: boolean;
  original: StatementSyntax;
}

function parseStatement(statement: StatementSyntax): ParsedStatement {
    let type = statement.type;
    let block = type === 'block' ? <Syntax.Block>statement : null;
    let append = type === 'optimized-append' ? <Syntax.OptimizedAppend>statement : null;
    let modifier = type === 'modifier' ? <Syntax.Modifier>statement : null;
    let appendType = append && append.value.type;

    type AppendValue = Syntax.Unknown | Syntax.Get;
    let args: Syntax.Args;
    let path: string[];

    if (block) {
      args = block.args;
      path = block.path;
    } else if (append && (appendType === 'unknown' || appendType === 'get')) {
      let appendValue = <AppendValue>append.value;
      args = Syntax.Args.empty();
      path = appendValue.ref.parts;
    } else if (append && append.value.type === 'helper') {
      let helper = <Syntax.Helper>append.value;
      args = helper.args;
      path = helper.ref.parts;
    } else if (modifier) {
      path = modifier.path;
      args = modifier.args;
    }

    let key: string, isSimple: boolean;

    if (path) {
      isSimple = path.length === 1;
      key = path[0];
    }

    return {
      isSimple,
      path,
      key,
      args,
      appendType,
      original: statement,
      isInline: !!append,
      isBlock: !!block,
      isModifier: !!modifier
    };
}
