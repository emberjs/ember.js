import Template, {
  YieldSyntax,
  AttributeSyntax,
  Helper as HelperSyntax,
  Unknown,
  Append,
  Hash,
  EvaluatedHash,
  ParamsAndHash,
  EvaluatedParams,
  Templates
} from "./template";

import { StatementSyntax } from './opcodes';
import { ContentMorph, TemplateMorph } from './morph';
import { ElementStack } from './builder';

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
} from 'htmlbars-reference';

import { VM } from './vm';

import { InternedString, LITERAL } from 'htmlbars-util';

let EMPTY_OBJECT = Object.freeze(Object.create(null));

import { LinkedList, LinkedListNode, Dict, dict } from 'htmlbars-util';
import { Destroyable } from './utils';
import { BlockInvocationMorph } from './morph';

function fork(ref: ChainableReference): Reference {
  throw new Error("unimplemented");
}

export class Block {
  template: Template;
  frame: Frame;

  constructor(template: Template, frame: Frame) {
    this.template = template;
    this.frame = frame;
  }
}

export abstract class Scope<T extends Object> {
  protected parent: Scope<T>;
  private self: RootReference = undefined;
  private locals: Dict<RootReference> = null;
  private blocks: Dict<Block> = null;
  private localNames: InternedString[];
  protected meta: MetaLookup;

  constructor(parent: Scope<T>, meta: MetaLookup, localNames: InternedString[]) {
    this.parent = parent;
    this.localNames = localNames;
    this.meta = meta;
  }

  init({ self, localNames, blockArguments, hostOptions? }: { self: any, localNames: InternedString[], blockArguments: any[], hostOptions?: any }): Scope<T> {
    if (self !== undefined) this.bindSelf(self);
    if (hostOptions) this.bindHostOptions(hostOptions);

    if (localNames && localNames.length) {
      this.localNames = localNames;
      this.bindLocals(blockArguments);
    }

    return this;
  }

  update({ self, blockArguments }: { self: any, blockArguments: any[] }) {
    if (self !== undefined) this.updateSelf(self);

    if (blockArguments && blockArguments.length) {
      this.updateLocals(blockArguments);
    }
  }

  abstract bindHostOptions(hostOptions: T);

  abstract getHostOptions(): T;

  abstract child(localNames: InternedString[]): Scope<T>;

  bindSelf(object: any) {
    this.self = this.meta.for(object).root();
  }

  updateSelf(value: any) {
    this.self.update(value);
  }

  getSelf(): RootReference {
    return this.self || (this.parent && this.parent.getSelf());
  }

  bindLocal(name: InternedString, value: any) {
    let locals = this.locals = this.locals || dict<RootReference>();
    locals[<string>name] = this.meta.for(value).root();
  }

  bindLocalReference(name: InternedString, value: RootReference) {
    let locals = this.locals = this.locals || dict<RootReference>();
    locals[<string>name] = value;
  }

  bindLocals(blockArguments: any[]) {
    let { localNames } = this;
    for (let i = 0, l = localNames.length; i < l; i++) {
      this.bindLocal(localNames[i], blockArguments[i]);
    }
  }

  bindLocalReferences(blockArguments: RootReference[]) {
    let { localNames } = this;
    for (let i = 0, l = localNames.length; i < l; i++) {
      this.bindLocalReference(localNames[i], blockArguments[i]);
    }
  }

  updateLocal(name: InternedString, value: any) {
    this.locals[<string>name].update(value);
  }

  updateLocals(blockArguments: any[]) {
    let { localNames } = this;
    for (let i = 0, l = localNames.length; i < l; i++) {
      this.updateLocal(localNames[i], blockArguments[i]);
    }
  }

  getLocal(name: InternedString): RootReference {
    if (!this.locals) return this.parent && this.parent.getLocal(name);
    return (<string>name in this.locals) ? this.locals[<string>name] : (this.parent && this.parent.getLocal(name));
  }

  hasLocal(name: InternedString): boolean {
    if (!this.locals) return this.parent && this.parent.hasLocal(name);
    return (<string>name in this.locals) || (this.parent && this.parent.hasLocal(name));
  }

  bindBlock(name: InternedString, block: Block) {
    let blocks = this.blocks = this.blocks || dict<Block>();
    blocks[<string>name] = block;
  }

  getBlock(name: InternedString): Block {
    if (!this.blocks) return this.parent && this.parent.getBlock(name);
    return (<string>name in this.blocks) ? this.blocks[<string>name] : (this.parent && this.parent.getBlock(name));
  }

  getBase(name: InternedString): PathReference {
    if (this.hasLocal(name)) return this.getLocal(name);
    let self = this.getSelf();
    if (self) return self.get(name);
  }
}

import DOMHelper from './dom';
import { EMPTY_ARRAY } from './utils';

export abstract class Environment<T extends Object> {
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

  getIdentity(object: any): InternedString {
    return this.meta.identity(object);
  }

  pushFrame(scope: Scope<T>): Frame {
    return new Frame(this, scope);
  }

  abstract createRootScope(): Scope<T>;

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

  abstract hasHelper(scope: Scope<T>, helperName: string[]): boolean;
  abstract lookupHelper(scope: Scope<T>, helperName: string[]): ConstReference<Helper>;
  abstract getComponentDefinition(scope: Scope<T>, tagName: string[], syntax: StatementSyntax): ComponentDefinition;
}

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

export class Frame {
  private env: Environment<any>;
  private _scope: Scope<any>;

  constructor(env: Environment<any>, scope: Scope<any>) {
    this.env = env;
    this._scope = scope;
  }

  child(): Frame {
    return new Frame(this.env, this._scope);
  }

  dom(): DOMHelper {
    return this.env.getDOM();
  }

  newVM(parentNode: Element, nextSibling: Node): VM<any> {
    let stack = new ElementStack({ dom: this.dom(), parentNode, nextSibling });
    return new VM(this.env, this.scope(), stack);
  }

  syntax(statement: StatementSyntax): StatementSyntax {
    return this.env.statement(statement);
  }

  childScope(blockArguments: any[]=null): Scope<any> {
    return (this._scope = this._scope.child(blockArguments));
  }

  setScope(scope: Scope<any>): Scope<any> {
    this._scope = scope;
    return scope;
  }

  resetScope(): Scope<any> {
    let parentHostOptions = this._scope.getHostOptions();
    let scope = this._scope = this.env.createRootScope();
    scope.bindHostOptions(parentHostOptions);
    return scope;
  }

  scope(): Scope<any> {
    return this._scope;
  }

  identity(object: any): InternedString {
    return this.env.getIdentity(object);
  }

  hasHelper(helperName: InternedString[]): boolean {
    return this.env.hasHelper(this._scope, helperName);
  }

  lookupHelper(helperName: InternedString[]): ConstReference<Helper> {
    return this.env.lookupHelper(this._scope, helperName);
  }

  getComponentDefinition(tagName: string[], syntax: StatementSyntax): ComponentDefinition {
    return this.env.getComponentDefinition(this._scope, tagName, syntax);
  }

  begin() {
    this.env.begin();
  }

  didCreate(component: Component, hooks: ComponentHooks) {
    this.env.didCreate(component, hooks);
  }

  didUpdate(component: Component, hooks: ComponentHooks) {
    this.env.didUpdate(component, hooks);
  }

  commit() {
    this.env.commit();
  }
}
