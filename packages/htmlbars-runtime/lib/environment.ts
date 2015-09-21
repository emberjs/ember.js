import Template from "./template";

import {
  Reference,
  ChainableReference,
  RootReference,
  PathReference,
  MetaLookup,
  InternedString
} from 'htmlbars-reference';

let EMPTY_OBJECT = Object.freeze(Object.create(null));

import { Dict, dict } from 'htmlbars-util';
import { Destroyable } from './utils';

function fork(ref: ChainableReference): Reference {
  throw new Error("unimplemented");
}

export interface Block {
  template: Template,
  frame: Frame
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
    let self = this.self;
    if (self) return self.get(name);
  }
}

import DOMHelper from './dom';
import { EMPTY_ARRAY } from './utils';

export abstract class Environment {
  private dom: DOMHelper;
  private meta: MetaLookup;

  constructor(dom: DOMHelper, meta: MetaLookup) {
    this.dom = dom;
    this.meta = meta;
  }
  
  getDOM(): DOMHelper { return this.dom; }

  pushFrame(scope: Scope): Frame {
    return new Frame(this, scope);
  }

  createRootScope(): Scope {
    return new Scope(null, this.meta, EMPTY_ARRAY);
  }

  abstract hasHelper(scope: Scope, helperName: string[]): boolean;
  abstract lookupHelper(scope: Scope, helperName: string[]): Helper;
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
  (positional: PositionalArguments, named: KeywordArguments): Insertion
}

export class Frame {
  private env: Environment;
  private _scope: Scope;

  constructor(env: Environment, scope: Scope) {
    this.env = env;
    this._scope = scope;
  }

  dom(): DOMHelper {
    return this.env.getDOM();
  }

  childScope(blockArguments: any[]) {
    return (this._scope = this._scope.child(blockArguments));
  }

  scope(): Scope {
    return this._scope;
  }

  hasHelper(helperName: InternedString[]): boolean {
    return this.env.hasHelper(this._scope, helperName);
  }

  lookupHelper(helperName: InternedString[]): Helper {
    return this.env.lookupHelper(this._scope, helperName);
  }
}
