import {
  Helper as HelperSyntax,
  Unknown,
  Append,
} from "./syntax/core";

import { StatementSyntax } from './syntax';

import { NULL_REFERENCE } from './references';

import {
  Component,
  ComponentHooks,
  ComponentDefinition
} from './component/interfaces';

import {
  PathReference,
  ConstReference,
  MetaLookup
} from 'glimmer-reference';

import {
  HasGuid,
  InternedString,
  intern,
  installGuid
} from 'glimmer-util';

import { RawBlock } from './compiler';

import { Dict } from 'glimmer-util';

type ScopeSlot = PathReference | RawBlock;

export class Scope {
  static root(parent: Scope, size = 0) {
    let refs: PathReference[] = new Array(size + 1);

    for (let i = 0; i <= size; i++) {
      refs[i] = NULL_REFERENCE;
    }

    return new Scope(parent, refs);
  }

  private parent: Scope;

  // the 0th slot is `self`
  private slots: ScopeSlot[];

  constructor(parent: Scope, references: ScopeSlot[]) {
    this.slots = references;
    this.parent = parent;
  }

  init({ self }: { self: PathReference }): this {
    this.slots[0] = self;
    return this;
  }

  getSelf(): PathReference {
    return this.slots[0] as PathReference;
  }

  getSymbol(symbol: number): PathReference {
    return this.slots[symbol] as PathReference;
  }

  getBlock(symbol: number): RawBlock {
    return this.slots[symbol] as RawBlock;
  }

  bindSymbol(symbol: number, value: PathReference) {
    this.slots[symbol] = value;
  }

  bindBlock(symbol: number, value: RawBlock) {
    this.slots[symbol] = value;
  }

  child() {
    return new Scope(this, this.slots.slice());
  }
}

import DOMHelper from './dom';

export abstract class Environment {
  protected dom: DOMHelper;
  protected meta: MetaLookup;
  private createdComponents: Component[] = [];
  private createdHooks: ComponentHooks[] = [];
  private updatedComponents: Component[] = [];
  private updatedHooks: ComponentHooks[] = [];

  constructor(dom: DOMHelper, meta: MetaLookup) {
    this.dom = dom;
    this.meta = meta;
  }

  getDOM(): DOMHelper { return this.dom; }

  getIdentity(object: HasGuid): InternedString {
    return intern(installGuid(object) + '');
  }

  createRootScope(size: number): Scope {
    return Scope.root(null, size);
  }

  statement(statement: StatementSyntax): StatementSyntax {
    let type = statement.type;

    if (type === 'append') {
      let append = <Append>statement;
      let unknown = append.value.type === 'unknown' ? <Unknown>append.value : null;
      let helper = append.value.type === 'helper' ? <HelperSyntax>append.value : null;

      if (unknown && unknown.simplePath() === 'yield') {
        return new YieldSyntax({ args: null });
      } else if (helper && helper.ref.simplePath() === 'yield') {
        return new YieldSyntax({ args: helper.args });
      }
    }

    return statement;
  }

  begin() {
    this.createdComponents = [];
    this.createdHooks = [];
    this.updatedComponents = [];
    this.updatedHooks = [];
  }

  didCreate(component: Component, hooks: ComponentHooks) {
    this.createdComponents.push(component);
    this.createdHooks.push(hooks);
  }

  didUpdate(component: Component, hooks: ComponentHooks) {
    this.updatedComponents.push(component);
    this.updatedHooks.push(hooks);
  }

  commit() {
    this.createdComponents.forEach((component, i) => {
      let hooks = this.createdHooks[i];
      hooks.didInsertElement(component);
      hooks.didRender(component);
    });

    this.updatedComponents.forEach((component, i) => {
      let hooks = this.updatedHooks[i];
      hooks.didUpdate(component);
      hooks.didRender(component);
    });
  }

  iteratorFor(iterable: PathReference) {
    let position = 0;
    let len = iterable.value().length;

    return {
      next() {
        if (position >= len) return { done: true, value: undefined };

        position++;

        return {
          done: false,
          value: iterable.get(intern("" + (position - 1)))
        };
      }
    };
  }

  abstract hasHelper(helperName: InternedString[]): boolean;
  abstract lookupHelper(helperName: InternedString[]): Helper;
  abstract hasComponentDefinition(tagName: InternedString[], syntax: StatementSyntax): boolean;
  abstract getComponentDefinition(tagName: InternedString[], syntax: StatementSyntax): ComponentDefinition;
}

export default Environment;

// TS does not allow us to use computed properties for this, so inlining for now
// import { TRUSTED_STRING } from './symbols';

interface SafeString {
  "trusted string [id=7d10c13d-cdf5-45f4-8859-b09ce16517c2]": boolean; // true
  string: string;
}

export type Insertion = string | SafeString | Node;

type PositionalArguments = any[];
type KeywordArguments = Dict<any>;

export interface Helper {
  (positional: PositionalArguments, named: KeywordArguments, options: Object): Insertion;
}

export function helper(h: Helper): ConstReference<Helper> {
  return new ConstReference(h);
}