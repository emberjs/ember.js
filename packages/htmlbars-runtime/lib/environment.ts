import Template, { StatementSyntax, Unknown } from "./template";
import { ElementBuffer, ElementStack } from './builder';

import {
  Reference,
  ChainableReference,
  RootReference,
  PathReference,
  ConstReference,
  MetaLookup
} from 'htmlbars-reference';

import { InternedString, LITERAL } from 'htmlbars-util';

let EMPTY_OBJECT = Object.freeze(Object.create(null));

import { Dict, dict } from 'htmlbars-util';
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

class Scope {
  private parent: Scope;
  private self: RootReference = undefined;
  private locals: Dict<RootReference> = null;
  private blocks: Dict<Block> = null;
  private localNames: InternedString[];
  private meta: MetaLookup;

  constructor(parent: Scope, meta: MetaLookup, localNames: InternedString[]) {
    this.parent = parent;
    this.localNames = localNames;
    this.meta = meta;
  }

  initTopLevel(self, localNames, blockArguments, hostOptions) {
    if (self) this.bindSelf(self);
    if (hostOptions) this.bindHostOptions(hostOptions);

    if (localNames) {
      let locals = this.locals = this.locals || dict<RootReference>();

      for (let i = 0, l = localNames.length; i < l; i++) {
        locals[localNames[i]] = blockArguments[i];
      }
    }

    return this;
  }

  bindHostOptions(hostOptions: Object) {
    throw new Error(`bindHostOptions not implemented for ${this.constructor.name}`)
  }

  child(localNames) {
    return new Scope(this, this.meta, localNames);
  }

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

  bindLocals(blockArguments: any[]) {
    let { localNames } = this;
    for (let i = 0, l = localNames.length; i < l; i++) {
      this.bindLocal(localNames[i], blockArguments[i]);
    }
  }

  updateLocal(name: InternedString, value: any) {
    this.locals[<string>name].update(value);
  }

  getLocal(name: InternedString): RootReference {
    if (!this.locals) return this.parent.getLocal(name);
    return (<string>name in this.locals) ? this.locals[<string>name] : (this.parent && this.parent.getLocal(name));
  }

  hasLocal(name: InternedString): boolean {
    if (!this.locals) return this.parent.hasLocal(name);
    return (<string>name in this.locals) || (this.parent && this.parent.hasLocal(name));
  }

  bindBlock(name: InternedString, block: Block) {
    let blocks = this.blocks = this.blocks || dict<Block>();
    blocks[<string>name] = block;
  }

  getBlock(name: InternedString): Block {
    if (!this.blocks) return this.parent.getBlock(name);
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

export interface ComponentClass {
  new (attrs: Object): Component;
}

export interface Component {

}

export abstract class Environment {
  private dom: DOMHelper;
  private meta: MetaLookup;

  constructor(dom: DOMHelper, meta: MetaLookup) {
    this.dom = dom;
    this.meta = meta;
  }

  getDOM(): DOMHelper { return this.dom; }

  getIdentity(object: any): InternedString {
    return this.meta.identity(object);
  }

  pushFrame(scope: Scope): Frame {
    return new Frame(this, scope);
  }

  createRootScope(): Scope {
    return new Scope(null, this.meta, EMPTY_ARRAY);
  }

  statement(statement: StatementSyntax): StatementSyntax {
    if (statement.type === 'unknown' && (<Unknown>statement).ref.path()[0] === 'yield') {
      return new YieldSyntax();
    }

    return statement;
  }

  abstract hasHelper(scope: Scope, helperName: string[]): boolean;
  abstract lookupHelper(scope: Scope, helperName: string[]): ConstReference<Helper>;
  abstract getComponentDefinition(scope: Scope, tagName: string[]): ComponentDefinition;
}

class YieldSyntax implements StatementSyntax {
  type = "yield";
  isStatic = false;

  prettyPrint() {
    return `{{yield}}`;
  }

  evaluate(stack: ElementStack, frame: Frame): BlockInvocationMorph {
    let block = frame.scope().getBlock(LITERAL('default'));
    return stack.createBlockMorph(block);
  }
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

export interface ComponentDefinition {
  class: ComponentClass;
  layout: Template;
}

export class Frame {
  private env: Environment;
  private _scope: Scope;

  constructor(env: Environment, scope: Scope) {
    this.env = env;
    this._scope = scope;
  }

  child(): Frame {
    return new Frame(this.env, this._scope);
  }

  dom(): DOMHelper {
    return this.env.getDOM();
  }

  syntax(statement: StatementSyntax): StatementSyntax {
    return this.env.statement(statement);
  }

  childScope(blockArguments: any[]) {
    return (this._scope = this._scope.child(blockArguments));
  }

  resetScope(): Scope {
    return (this._scope = this.env.createRootScope());
  }

  scope(): Scope {
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

  getComponentDefinition(tagName: string[]): ComponentDefinition {
    return this.env.getComponentDefinition(this._scope, tagName);
  }
}
