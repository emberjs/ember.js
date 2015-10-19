import Template, {
  StatementSyntax,
  AttributeSyntax,
  Component as ComponentSyntax,
  Unknown,
  Inline,
  EvaluatedHash,
  ParamsAndHash,
  EvaluatedParams
} from "./template";

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

export class Scope {
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

export abstract class Environment {
  private dom: DOMHelper;
  private meta: MetaLookup;
  private createdComponents: Component[] = [];
  private createdDefinitions: ComponentDefinition[] = [];
  private updatedComponents: Component[] = [];
  private updatedDefinitions: ComponentDefinition[] = [];

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
    this.createdDefinitions = [];
    this.updatedComponents = [];
    this.updatedDefinitions = [];
  }

  didCreate(component: Component, definition: ComponentDefinition) {
    this.createdComponents.push(component);
    this.createdDefinitions.push(definition);
  }

  didUpdate(component: Component, definition: ComponentDefinition) {
    this.updatedComponents.push(component);
    this.updatedDefinitions.push(definition);
  }

  commit() {
    this.createdComponents.forEach((component, i) => {
      let definition = this.createdDefinitions[i];
      definition.hooks.didInsertElement(component);
      definition.hooks.didRender(component);
    });

    this.updatedComponents.forEach((component, i) => {
      let definition = this.updatedDefinitions[i];
      definition.hooks.didUpdate(component);
      definition.hooks.didRender(component);
    });
  }

  abstract hasHelper(scope: Scope, helperName: string[]): boolean;
  abstract lookupHelper(scope: Scope, helperName: string[]): ConstReference<Helper>;
  abstract getComponentDefinition(scope: Scope, tagName: string[], syntax: ComponentSyntax): ComponentDefinition;
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

export interface ComponentDefinition {
  class: ComponentClass;
  layout: Template;
  rootElement: (component: any, element: Element) => void;
  rootElementAttrs: (component: any, outer: EvaluatedHash, attrs: AttributeSyntax[], layoutFrame: Frame, contentFrame: Frame) => AttributeSyntax[];
  creationObjectForAttrs: (Component: ComponentClass, attrs: Object) => Object;
  updateObjectFromAttrs: (component: any, attrs: Object) => void;
  setupLayoutScope: (component: any, layout: Template, yielded: Template) => void;
  allowedForSyntax: (component: any, syntax: StatementSyntax) => boolean;
  hooks: ComponentHooks;
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

  getComponentDefinition(tagName: string[], syntax: ComponentSyntax): ComponentDefinition {
    return this.env.getComponentDefinition(this._scope, tagName, syntax);
  }

  begin() {
    this.env.begin();
  }

  didCreate(component: Component, definition: ComponentDefinition) {
    this.env.didCreate(component, definition);
  }

  didUpdate(component: Component, definition: ComponentDefinition) {
    this.env.didUpdate(component, definition);
  }

  commit() {
    this.env.commit();
  }
}
