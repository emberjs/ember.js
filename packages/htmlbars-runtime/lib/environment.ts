import Template from "./template";

/**
  HTMLBars delegates the runtime behavior of a template to
  hooks provided by the host environment. These hooks explain
  the lexical environment of a Handlebars template, the internal
  representation of references, and the interaction between an
  HTMLBars template and the DOM it is managing.

  While HTMLBars host hooks have access to all of this internal
  machinery, templates and helpers have access to the abstraction
  provided by the host hooks.

  ## The Lexical Environment

  The default lexical environment of an HTMLBars template includes:

  * Any local variables, provided by *block arguments*
  * The current value of `self`

  ## Simple Nesting

  Let's look at a simple template with a nested block:

  ```hbs
  <h1>{{title}}</h1>

  {{#if author}}
    <p class="byline">{{author}}</p>
  {{/if}}
  ```

  In this case, the lexical environment at the top-level of the
  template does not change inside of the `if` block. This is
  achieved via an implementation of `if` that looks like this:

  ```js
  registerHelper('if', function(params) {
    if (!!params[0]) {
      return this.yield();
    }
  });
  ```

  A call to `this.yield` invokes the child template using the
  current lexical environment.

  ## Block Arguments

  It is possible for nested blocks to introduce new local
  variables:

  ```hbs
  {{#count-calls as |i|}}
  <h1>{{title}}</h1>
  <p>Called {{i}} times</p>
  {{/count}}
  ```

  In this example, the child block inherits its surrounding
  lexical environment, but augments it with a single new
  variable binding.

  The implementation of `count-calls` supplies the value of
  `i`, but does not otherwise alter the environment:

  ```js
  var count = 0;
  registerHelper('count-calls', function() {
    return this.yield([ ++count ]);
  });
  ```
*/

let EMPTY_OBJECT = Object.freeze(Object.create(null));

function dict() {
  return Object.create(EMPTY_OBJECT);
}

import { Destroyable, Dict } from './utils';

function fork(ref: ChainableReference): Reference {
  throw new Error("unimplemented");
}

export interface Block {
  template: Template,
  frame: Frame
}

class Scope {
  private parent: Scope;
  private self: RootReference;
  private locals: Dict<RootReference>;
  private blocks: Dict<Block>;
  private localNames: string[];
  private meta: MetaLookup;
  
  constructor(parent: Scope, meta: MetaLookup, localNames: string[]) {
    this.parent = parent;
    this.self = undefined;
    this.locals = null;
    this.blocks = null;
    this.localNames = localNames;
  }

  initTopLevel(self, localNames, blockArguments, hostOptions) {
    if (self) this.bindSelf(self);
    if (hostOptions) this.bindHostOptions(hostOptions);

    if (localNames) {
      let locals = this.locals = this.locals || dict();

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

  bindLocal(name: string, value: any) {
    let locals = this.locals = this.locals || dict();
    locals[name] = this.meta.for(value).root();
  }

  bindLocals(blockArguments) {
    let { localNames } = this;
    for (let i = 0, l = localNames.length; i < l; i++) {
      this.bindLocal(localNames[i], blockArguments[i]);
    }
  }

  updateLocal(name: string, value: any) {
    this.locals[name].update(value);
  }

  getLocal(name: string): RootReference {
    if (!this.locals) return this.parent.getLocal(name);
    return (name in this.locals) ? this.locals[name] : (this.parent && this.parent.getLocal(name));
  }

  hasLocal(name: string): boolean {
    if (!this.locals) return this.parent.hasLocal(name);
    return (name in this.locals) || (this.parent && this.parent.hasLocal(name));
  }

  bindBlock(name: string, block: Block) {
    let blocks = this.blocks = this.blocks || dict();
    blocks[name] = block;
  }

  getBlock(name: string): Block {
    if (!this.blocks) return this.parent.getBlock(name);
    return (name in this.blocks) ? this.blocks[name] : (this.parent && this.parent.getBlock(name));
  }
  
  getBase(name: string): PathReference {
    if (this.hasLocal(name)) return this.getLocal(name);
    let self = this.self;
    if (self) return self.get(name);
  }
}

import DOMHelper from './dom';
import { EMPTY_ARRAY } from './utils';

export class Environment {
  private dom: DOMHelper;
  private meta: MetaLookup;
  
  constructor(dom: DOMHelper, meta: MetaLookup) {
    this.dom = dom;
  }
  
  getDOM(): DOMHelper { return this.dom; }

  pushFrame(scope: Scope): Frame {
    return new Frame(this, scope);
  }

  createRootScope(): Scope {
    return new Scope(null, this.meta, EMPTY_ARRAY);
  }

  hasHelper(scope: Scope, helperName: string[]): boolean {
    throw new Error("Unimplemented hasHelper");
  }

  lookupHelper(scope: Scope, helperName: string[]): Helper {
    throw new Error("Unimplemented lookupHelper");
  }

  helperParamsReference(/* evaluatedParams */) {
    throw new Error("Unimplemented helperParamsReference");
  }
}

// TS does not allow us to use computed properties for this, so inlining for now
// import { TRUSTED_STRING } from './symbols';

interface SafeString {
  "trusted string [id=7d10c13d-cdf5-45f4-8859-b09ce16517c2]": boolean, // true
  string: string
}

type Insertion = string | SafeString | Node; 

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

  hasHelper(helperName: string[]): boolean {
    return this.env.hasHelper(this._scope, helperName);
  }

  lookupHelper(helperName: string[]): Helper {
    return this.env.lookupHelper(this._scope, helperName);
  }
}
