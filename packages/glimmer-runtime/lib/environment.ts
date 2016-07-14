import { Statement as StatementSyntax } from './syntax';

import { DOMHelper } from './dom/helper';
import { Reference, OpaqueIterable } from 'glimmer-reference';
import { NULL_REFERENCE, ConditionalReference } from './references';
import {
  defaultChangeLists
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
  IChangeList
} from './dom/change-lists';

import {
  ModifierManager
} from './modifier/interfaces';

import {
  PathReference
} from 'glimmer-reference';

import {
  HasGuid,
  InternedString,
  intern,
  ensureGuid
} from 'glimmer-util';

import {
  BlockMeta
} from 'glimmer-wire-format';

import { EvaluatedArgs } from './compiled/expressions/args';

import { InlineBlock } from './compiled/blocks';

import { Destroyable, Dict, Opaque } from 'glimmer-util';

import * as Syntax from './syntax/core';

import IfSyntax from './syntax/builtins/if';
import UnlessSyntax from './syntax/builtins/unless';
import WithSyntax from './syntax/builtins/with';
import EachSyntax from './syntax/builtins/each';
import PartialSyntax from './syntax/builtins/partial';

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
  protected dom: DOMHelper;
  private createdComponents: Component[] = null;
  private createdManagers: ComponentManager<Component>[] = null;
  private updatedComponents: Component[] = null;
  private updatedManagers: ComponentManager<Component>[] = null;
  private destructors: Destroyable[] = null;

  constructor(dom: DOMHelper) {
    this.dom = dom;
  }

  toConditionalReference(reference: Reference<Opaque>): Reference<boolean> {
    return new ConditionalReference(reference);
  }

  abstract iterableFor(reference: Reference<Opaque>, args: EvaluatedArgs): OpaqueIterable;

  getDOM(): DOMHelper { return this.dom; }

  getIdentity(object: HasGuid): InternedString {
    return intern(ensureGuid(object) + '');
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

  hasKeyword(string: InternedString): boolean {
    return false;
  }

  abstract hasHelper(helperName: InternedString[], blockMeta: BlockMeta): boolean;
  abstract lookupHelper(helperName: InternedString[], blockMeta: BlockMeta): Helper;

  attributeFor(element: Element, attr: InternedString, reference: Reference<Opaque>, isTrusting: boolean, namespace?: InternedString): IChangeList {
    return defaultChangeLists(element, attr, isTrusting, namespace);
  }

  abstract hasPartial(partialName: InternedString[]): boolean;
  abstract lookupPartial(PartialName: InternedString[]): PartialDefinition;
  abstract hasComponentDefinition(tagName: InternedString[]): boolean;
  abstract getComponentDefinition(tagName: InternedString[]): ComponentDefinition<Opaque>;

  abstract hasModifier(modifierName: InternedString[]): boolean;
  abstract lookupModifier(modifierName: InternedString[]): ModifierManager<Opaque>;
}

export default Environment;

type PositionalArguments = Opaque[];
type KeywordArguments = Dict<Opaque>;

export interface Helper {
  (args: EvaluatedArgs): PathReference<Opaque>;
}

export interface ParsedStatement {
  isSimple: boolean;
  path: InternedString[];
  key: InternedString;
  args: Syntax.Args;
  isInline: boolean;
  isBlock: boolean;
  isModifier: boolean;
  templates: Syntax.Templates;
}

function parseStatement(statement: StatementSyntax): ParsedStatement {
    let type = statement.type;
    let block = type === 'block' ? <Syntax.Block>statement : null;
    let append = type === 'append' ? <Syntax.Append>statement : null;
    let modifier = type === 'modifier' ? <Syntax.Modifier>statement : null;

    let named: Syntax.NamedArgs;
    let args: Syntax.Args;
    let path: InternedString[];
    let unknown: Syntax.Unknown;
    let helper: Syntax.Helper;

    if (block) {
      args = block.args;
      named = args.named;
      path = block.path;
    } else if (append && append.value.type === 'unknown') {
      unknown = <Syntax.Unknown>append.value;
      args = Syntax.Args.empty();
      named = Syntax.NamedArgs.empty();
      path = unknown.ref.path();
    } else if (append && append.value.type === 'helper') {
      helper = <Syntax.Helper>append.value;
      args = helper.args;
      named = args.named;
      path = helper.ref.path();
    } else if (modifier) {
      path = modifier.path;
      args = modifier.args;
    }

    let key: InternedString, isSimple: boolean;

    if (path) {
      isSimple = path.length === 1;
      key = path[0];
    }

    return {
      isSimple,
      path,
      key,
      args,
      isInline: !!append,
      isBlock: !!block,
      isModifier: !!modifier,
      templates: block && block.templates
    };
}
