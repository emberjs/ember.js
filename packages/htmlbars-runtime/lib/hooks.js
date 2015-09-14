import { assert } from "../htmlbars-util";

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

class Scope {
  constructor(parent, BaseReference, localNames) {
    this.parent = parent;
    this.self = undefined;
    this.locals = null;
    this.blocks = null;
    this.localNames = localNames;
    this.BaseReference = BaseReference;
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

  child(localNames) {
    return new Scope(this, this.BaseReference, localNames);
  }

  bindSelf(reference) {
    this.self = new this.BaseReference(reference);
  }

  updateSelf(value) {
    this.self.update(value);
  }

  getSelf() {
    return this.self || (this.parent && this.parent.getSelf());
  }

  bindLocal(name, reference) {
    let locals = this.locals = this.locals || dict();
    locals[name] = new this.BaseReference(reference);
  }

  bindLocals(blockArguments) {
    let { localNames } = this;
    for (let i = 0, l = localNames.length; i < l; i++) {
      this.bindLocal(localNames[i], blockArguments[i]);
    }
  }

  updateLocal(name, value) {
    this.locals[name].update(value);
  }

  getLocal(name) {
    if (!this.locals) return this.parent.getLocal(name);
    return (name in this.locals) ? this.locals[name] : (this.parent && this.parent.getLocal(name));
  }

  hasLocal(name) {
    if (!this.locals) return this.parent.hasLocal(name);
    return (name in this.locals) || (this.parent && this.parent.hasLocal(name));
  }

  bindBlock(name, block) {
    let blocks = this.blocks = this.blocks || dict();
    blocks[name] = block;
  }

  getBlock(name) {
    if (!this.blocks) return this.parent.getBlock(name);
    return (name in this.blocks) ? this.blocks[name] : (this.parent && this.parent.getBlock(name));
  }

  getBaseReference(name) {
    if (this.hasLocal(name)) return this.getLocal(name);
    let self = this.self;
    if (self) return self.get(name);
  }
}

export class Environment {
  constructor({ dom, BaseReference }) {
    this.dom = dom;
    this.BaseReference = BaseReference;
  }

  pushFrame(scope) {
    return new Frame(this, scope);
  }

  createRootScope() {
    return new Scope(null, this.BaseReference);
  }

  hasHelper(/* scope, helperName */) {
    throw new Error("Unimplemented hasHelper");
  }

  lookupHelper(/* scope, helperName */) {
    throw new Error("Unimplemented lookupHelper");
  }

  helperParamsReference(/* evaluatedParams */) {
    throw new Error("Unimplemented helperParamsReference");
  }

  syntaxExtension(/* statement */) {
    return null;
  }
}

export class Frame {
  constructor(env, scope) {
    this._env = env;
    this._scope = scope;
    this._childScopeCalled = false; // TODO: This can be removed once things stabilize
  }

  dom() {
    return this._env.dom;
  }

  childScope(blockArguments) {
    assert(!this._childScopeCalled, "You can only call childScope once per frame");
    this._childScopeCalled = true;
    return (this._scope = this._scope.child(blockArguments));
  }

  syntaxExtension(statement) {
    return this._env.syntaxExtension(statement);
  }

  scope() {
    return this._scope;
  }

  hasHelper(helperName) {
    return this._env.hasHelper(this._scope, helperName);
  }

  lookupHelper(helperName) {
    return this._env.lookupHelper(this._scope, helperName);
  }

  helperParamsReference(evaluatedParams) {
    return this._env.helperParamsReference(evaluatedParams);
  }
}
