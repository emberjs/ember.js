import Template, {
  StatementSyntax,
  AttributeSyntax,
  Component as ComponentSyntax,
  Unknown,
  Inline,
  Hash,
  EvaluatedHash,
  ParamsAndHash,
  EvaluatedParams,
  TemplateEvaluation,
  Templates
} from "./template";

import { ContentMorph } from './morph';
import { ElementStack } from './builder';

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

  abstract bindHostOptions(hostOptions: T);

  abstract getHostOptions(): T;

  abstract child(localNames: InternedString[]);

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

export interface ComponentClass {
  new (attrs: Object): Component;
}

export interface Component {
  attrs: Object;
}

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

    if (type === 'unknown' && (<Unknown>statement).ref.path()[0] === 'yield') {
      return new YieldSyntax(null, LITERAL('default'));
    } else if (type === 'inline' && (<Inline>statement).path[0] === 'yield') {
      let args = (<Inline>statement).args;
      return new YieldSyntax((<Inline>statement).args);
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

class YieldSyntax implements StatementSyntax {
  type = "yield";
  isStatic = false;
  private args: ParamsAndHash;

  constructor(args: ParamsAndHash, to: InternedString) {
    this.args = args;
  }

  prettyPrint() {
    return `{{yield}}`;
  }

  evaluate(stack: ElementStack, frame: Frame): BlockInvocationMorph {
    let yieldTo: InternedString = null, params: EvaluatedParams = null;

    if (this.args) {
      params = this.args.params.evaluate(frame);
      let hash = this.args.hash.evaluate(frame);
      let toRef = hash.at(LITERAL('to'));
      yieldTo = toRef && toRef.value();
    }

    let block = frame.scope().getBlock(yieldTo || LITERAL('default'));

    if (!block) throw new Error(`The block ${yieldTo} wasn't available to be yielded to.`);

    return stack.createBlockMorph(block, frame, params);
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

export interface ComponentHooks {
  begin(Component);
  commit(Component);

  didReceiveAttrs(Component);
  didUpdateAttrs(Component);

  didInsertElement(Component);

  willRender(Component);
  willUpdate(Component);
  didRender(Component);
  didUpdate(Component);
}

export interface ComponentDefinitionOptions {
  frame: Frame;
  templates: Templates;
  hash: EvaluatedHash;
  tag: InternedString;
}

export interface ComponentDefinition {
  ComponentClass: ComponentClass;
  layout: Template;
  begin(stack: ElementStack, { frame, templates, hash, tag }: ComponentDefinitionOptions): AppendingComponent;
  hooks: ComponentHooks;
}

export function appendComponent(stack: ElementStack, definition: ComponentDefinition, options: ComponentDefinitionOptions): ContentMorph {
  let appending = definition.begin(stack, options);
  let morph = appending.process();
  morph.append(stack);
  return morph;
}

export interface AppendingComponent {
  ComponentClass: ComponentClass;
  layout: Template;
  process(): ContentMorph;
  update(component: Component, attrs: EvaluatedHash);
  commit();
  hooks: ComponentHooks;
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

  syntax(statement: StatementSyntax): StatementSyntax {
    return this.env.statement(statement);
  }

  childScope(blockArguments: any[]=null) {
    return (this._scope = this._scope.child(blockArguments));
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
