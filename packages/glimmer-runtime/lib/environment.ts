import { Statement as StatementSyntax } from './syntax';

import { DOMChanges, DOMTreeConstruction } from './dom/helper';
import { Reference, OpaqueIterable } from 'glimmer-reference';
import { NULL_REFERENCE, ConditionalReference } from './references';
import {
  defaultChangeLists,
  IChangeList
} from './dom/change-lists';

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
  PathReference
} from 'glimmer-reference';

import {
  Destroyable,
  Dict,
  Opaque,
  HasGuid,
  ensureGuid
} from 'glimmer-util';

import {
  BlockMeta
} from 'glimmer-wire-format';

import { EvaluatedArgs } from './compiled/expressions/args';

import { InlineBlock } from './compiled/blocks';

import * as Syntax from './syntax/core';

import IfSyntax from './syntax/builtins/if';
import UnlessSyntax from './syntax/builtins/unless';
import WithSyntax from './syntax/builtins/with';
import EachSyntax from './syntax/builtins/each';
import PartialSyntax from './syntax/builtins/partial';

import { PublicVM } from './vm/append';

type ScopeSlot = PathReference<Opaque> | InlineBlock;

export interface DynamicScope {
  child(): DynamicScope;
}

export class Scope {
  static root(self: PathReference<Opaque>, size = 0) {
    let refs: PathReference<Opaque>[] = new Array(size + 1);

    for (let i = 0; i <= size; i++) {
      refs[i] = NULL_REFERENCE;
    }

    return new Scope(refs).init({ self });
  }

  // the 0th slot is `self`
  private slots: ScopeSlot[];
  private callerScope: Scope = null;

  constructor(references: ScopeSlot[]) {
    this.slots = references;
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
    return new Scope(this.slots.slice());
  }
}

export abstract class Environment {
  protected updateOperations: DOMChanges;
  protected appendOperations: DOMTreeConstruction;
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

  getDOM(): DOMChanges { return this.updateOperations; }
  getAppendOperations(): DOMTreeConstruction { return this.appendOperations; }

  getIdentity(object: HasGuid): string {
    return ensureGuid(object) + '';
  }

  statement(statement: StatementSyntax, blockMeta: BlockMeta): StatementSyntax {
    return this.refineStatement(parseStatement(statement), blockMeta) || statement;
  }

  protected refineStatement(statement: ParsedStatement, blockMeta: BlockMeta): StatementSyntax {
    let {
      isSimple,
      isBlock,
      isInline,
      key,
      args,
      templates
    } = statement;

    if (isSimple && isInline) {
      if (key === 'partial') {
        return new PartialSyntax({ args });
      }
    }

    if (isSimple && isBlock) {
      switch (key) {
        case 'each':
          return new EachSyntax({ args, templates });
        case 'if':
          return new IfSyntax({ args, templates });
        case 'with':
          return new WithSyntax({ args, templates });
        case 'unless':
          return new UnlessSyntax({ args, templates });
      }
    }
  }

  begin() {
    this.createdComponents = [];
    this.createdManagers = [];
    this.updatedComponents = [];
    this.updatedManagers = [];
    this.destructors = [];
  }

  didCreate<T>(component: T, manager: ComponentManager<T>) {
    this.createdComponents.push(component as any);
    this.createdManagers.push(manager as any);
  }

  didUpdate<T>(component: T, manager: ComponentManager<T>) {
    this.updatedComponents.push(component as any);
    this.updatedManagers.push(manager as any);
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

    for (let i=this.updatedComponents.length-1; i>=0; i--) {
      let component = this.updatedComponents[i];
      let manager = this.updatedManagers[i];
      manager.didUpdate(component);
    }

    for (let i=0; i<this.destructors.length; i++) {
      this.destructors[i].destroy();
    }
  }

  hasKeyword(string: string): boolean {
    return false;
  }

  abstract hasHelper(helperName: string[], blockMeta: BlockMeta): boolean;
  abstract lookupHelper(helperName: string[], blockMeta: BlockMeta): Helper;

  attributeFor(element: Element, attr: string, reference: Reference<Opaque>, isTrusting: boolean, namespace?: string): IChangeList {
    return defaultChangeLists(element, attr, isTrusting, namespace);
  }

  abstract hasPartial(partialName: string[]): boolean;
  abstract lookupPartial(PartialName: string[]): PartialDefinition;
  abstract hasComponentDefinition(tagName: string[]): boolean;
  abstract getComponentDefinition(tagName: string[]): ComponentDefinition<Opaque>;

  abstract hasModifier(modifierName: string[]): boolean;
  abstract lookupModifier(modifierName: string[]): ModifierManager<Opaque>;
}

export default Environment;

type PositionalArguments = Opaque[];
type KeywordArguments = Dict<Opaque>;

export interface Helper {
  (vm: PublicVM, args: EvaluatedArgs): PathReference<Opaque>;
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
  templates: Syntax.Templates;
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
      path = appendValue.ref.path();
    } else if (append && append.value.type === 'helper') {
      let helper = <Syntax.Helper>append.value;
      args = helper.args;
      path = helper.ref.path();
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
      isModifier: !!modifier,
      templates: block && block.templates
    };
}
