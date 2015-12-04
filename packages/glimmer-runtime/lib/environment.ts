import Template, {
  YieldSyntax,
  Helper as HelperSyntax,
  Unknown,
  Append,
  Templates
} from "./template";

import { ElementStack } from './builder';

import { StatementSyntax } from './syntax';

import {
  Component,
  ComponentHooks,
  ComponentDefinition
} from './component/interfaces';

import {
  Reference,
  ChainableReference,
  RootReference,
  PathReference,
  ConstReference,
  MetaLookup
} from 'glimmer-reference';

import { VM } from './vm';

import {
  LITERAL,
  HasGuid,
  InternedString,
  symbol,
  intern,
  installGuid
} from 'glimmer-util';

let EMPTY_OBJECT = Object.freeze(Object.create(null));

import { LinkedList, LinkedListNode, Dict, dict } from 'glimmer-util';
import { Destroyable } from './utils';

function fork(ref: ChainableReference): Reference {
  throw new Error("unimplemented");
}

export class Scope {
  static root(parent: Scope, size = 0) {
    let refs: PathReference[] = new Array(size + 1);

    for (let i = 0; i < size; i++) {
      refs[i] = null;
    }

    return new Scope(parent, refs);
  }

  private parent: Scope;

  // the 0th slot is `self`
  private references: PathReference[];

  constructor(parent: Scope, references: PathReference[]) {
    this.references = references;
    this.parent = parent;
  }

  init({ self }: { self: PathReference }): this {
    this.references[0] = self;
    return this;
  }

  getSelf(): PathReference {
    return this.references[0];
  }

  getSymbol(symbol: number): PathReference {
    return this.references[symbol];
  }

  bindSymbol(symbol: number, value: PathReference) {
    this.references[symbol] = value;
  }

  child() {
    return new Scope(this, this.references.slice());
  }
}

import DOMHelper from './dom';
import { EMPTY_ARRAY } from './utils';

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
    }
  }

  abstract hasHelper(helperName: InternedString[]): boolean;
  abstract lookupHelper(helperName: InternedString[]): Helper;
  abstract getComponentDefinition(tagName: InternedString[], syntax: StatementSyntax): ComponentDefinition;
}

export default Environment;

// TS does not allow us to use computed properties for this, so inlining for now
// import { TRUSTED_STRING } from './symbols';

interface SafeString {
  "trusted string [id=7d10c13d-cdf5-45f4-8859-b09ce16517c2]": boolean, // true
  string: string
}

export type Insertion = string | SafeString | Node;

type PositionalArguments = any[];
type KeywordArguments = Dict<any>;

export interface Helper {
  (positional: PositionalArguments, named: KeywordArguments, options: Object): Insertion
}

export function helper(h: Helper): ConstReference<Helper> {
  return new ConstReference(h);
}