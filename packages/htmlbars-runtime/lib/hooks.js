import MorphList from "../morph-range/morph-list";
import { createChildMorph, manualElement } from "./render";
import { keyLength, shallowCopy } from "../htmlbars-util/object-utils";
import { validateChildMorphs } from "../htmlbars-util/morph-utils";
import { Block, BlockOptions, clearMorph } from "../htmlbars-util/template-utils";
import { linkParams } from "../htmlbars-util/morph-utils";
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

export function wrapForHelper(template, env, scope, morph, visitor) {
  if (!template) { return {}; }

  var yieldArgs = yieldTemplate(template, env, scope, morph, visitor);

  return {
    meta: template.meta,
    arity: template.arity,
    yield: yieldArgs,
    yieldItem: yieldItem(template, env, scope, morph, visitor),
    raw: template,

    render: function(self, blockArguments) {
      yieldArgs(blockArguments, self);
    }
  };
}

// Called by a user-land helper to render a template.
function yieldTemplate(template, env, parentScope, morph, visitor) {
  return function(blockArguments, self) {
    var scope = parentScope;

    if (morph.lastYielded && isStableTemplate(template, morph.lastYielded)) {
      return morph.lastResult.revalidateWith(env, self, blockArguments, visitor);
    }

    // Check to make sure that we actually **need** a new scope, and can't
    // share the parent scope. Note that we need to move this check into
    // a host hook, because the host's notion of scope may require a new
    // scope in more cases than the ones we can determine statically.
    if (self !== undefined || parentScope === null || template.arity) {
      scope = env.hooks.createChildScope(parentScope);
      env.hooks.setupScope(env, scope, self, template.locals, blockArguments);
    }

    morph.clearForRender();
    morph.lastYielded = { self: self, template: template, shadowTemplate: null };

    // Render the template that was selected by the helper
    template.renderIn(morph, env, scope);
  };
}

function yieldItem(template, env, parentScope, morph, visitor) {
  var renderState; // REFACTOR TODO
  // Initialize state that tracks multiple items being
  // yielded in.
  var currentMorph = null;

  // Candidate morphs for deletion.
  var candidates = {};

  // Reuse existing MorphList if this is not a first-time
  // render.
  var morphList = morph.morphList;
  if (morphList) {
    currentMorph = morphList.firstChildMorph;
  }

  // Advances the currentMorph pointer to the morph in the previously-rendered
  // list that matches the yielded key. While doing so, it marks any morphs
  // that it advances past as candidates for deletion. Assuming those morphs
  // are not yielded in later, they will be removed in the prune step during
  // cleanup.
  // Note that this helper function assumes that the morph being seeked to is
  // guaranteed to exist in the previous MorphList; if this is called and the
  // morph does not exist, it will result in an infinite loop
  function advanceToKey(key) {
    let seek = currentMorph;

    while (seek.key !== key) {
      candidates[seek.key] = seek;
      seek = seek.nextMorph;
    }

    currentMorph = seek.nextMorph;
    return seek;
  }

  return function(_key, blockArguments, self) {
    if (typeof _key !== 'string') {
      throw new Error("You must provide a string key when calling `yieldItem`; you provided " + _key);
    }

    // At least one item has been yielded, so we do not wholesale
    // clear the last MorphList but instead apply a prune operation.
    morph.lastYielded = null;

    var morphList, morphMap;

    if (!morph.morphList) {
      morph.morphList = new MorphList();
      morph.morphMap = {};
      morph.setMorphList(morph.morphList);
    }

    morphList = morph.morphList;
    morphMap = morph.morphMap;

    // A map of morphs that have been yielded in on this
    // rendering pass. Any morphs that do not make it into
    // this list will be pruned from the MorphList during the cleanup
    // process.
    let handledMorphs = renderState.handledMorphs;
    let key;

    if (_key in handledMorphs) {
      // In this branch we are dealing with a duplicate key. The strategy
      // is to take the original key and append a counter to it that is
      // incremented every time the key is reused. In order to greatly
      // reduce the chance of colliding with another valid key we also add
      // an extra string "--z8mS2hvDW0A--" to the new key.
      let collisions = renderState.collisions;
      if (collisions === undefined) {
        collisions = renderState.collisions = {};
      }
      let count = collisions[_key] | 0;
      collisions[_key] = ++count;

      key = _key + '--z8mS2hvDW0A--' + count;
    } else {
      key = _key;
    }

    if (currentMorph && currentMorph.key === key) {
      yieldTemplate(template, env, parentScope, currentMorph, visitor)(blockArguments, self);
      currentMorph = currentMorph.nextMorph;
      handledMorphs[key] = currentMorph;
    } else if (morphMap[key] !== undefined) {
      let foundMorph = morphMap[key];

      if (key in candidates) {
        // If we already saw this morph, move it forward to this position
        morphList.insertBeforeMorph(foundMorph, currentMorph);
      } else {
        // Otherwise, move the pointer forward to the existing morph for this key
        advanceToKey(key);
      }

      handledMorphs[foundMorph.key] = foundMorph;
      yieldTemplate(template, env, parentScope, foundMorph, visitor)(blockArguments, self);
    } else {
      var childMorph = createChildMorph(env.dom, morph);
      childMorph.key = key;
      morphMap[key] = handledMorphs[key] = childMorph;
      morphList.insertBeforeMorph(childMorph, currentMorph);
      yieldTemplate(template, env, parentScope, childMorph, visitor)(blockArguments, self);
    }

    morph.childNodes = null;
  };
}

function isStableTemplate(template, lastYielded) {
  return !lastYielded.shadowTemplate && template === lastYielded.template;
}
function optionsFor(template, inverse, env, scope, morph, visitor) {
  return {
    templates: {
      template: wrapForHelper(template, env, scope, morph, visitor),
      inverse: wrapForHelper(inverse, env, scope, morph, visitor)
    },
  };
}

function thisFor(options) {
  return {
    arity: options.template.arity,
    yield: options.template.yield,
    yieldItem: options.template.yieldItem
  };
}

/**
  Host Hook: createScope

  @param {Scope?} parentScope
  @return Scope

  Corresponds to entering a new HTMLBars block.

  This hook is invoked when a block is entered with
  a new `self` or additional local variables.

  When invoked for a top-level template, the
  `parentScope` is `null`, and this hook should return
  a fresh Scope.

  When invoked for a child template, the `parentScope`
  is the scope for the parent environment.

  Note that the `Scope` is an opaque value that is
  passed to other host hooks. For example, the `get`
  hook uses the scope to retrieve a value for a given
  scope and variable name.
*/
export function createScope(env, parentScope) {
  if (parentScope) {
    return env.hooks.createChildScope(parentScope);
  } else {
    return env.hooks.createFreshScope();
  }
}

export function createFreshScope() {
  // because `in` checks have unpredictable performance, keep a
  // separate dictionary to track whether a local was bound.
  // See `bindLocal` for more information.
  return { self: null, blocks: {}, locals: {}, localPresent: {} };
}

export function setupScope(env, scope, self, localNames, blockArguments, hostOptions) {
  if (self !== undefined) { env.hooks.bindSelf(env, scope, self); }
  if (blockArguments !== undefined) {
    for (let i=0, l=localNames.length; i<l; i++) {
      env.hooks.bindLocal(env, scope, localNames[i], blockArguments[i]);
    }
  }

  if (env.hooks.customSetupScope && hostOptions) {
    env.hooks.customSetupScope(env, scope, hostOptions);
  }
}

export function updateScope(env, scope, self, localNames, blockArguments, hostOptions) {
  if (self !== undefined) { env.hooks.updateSelf(env, scope, self); }
  if (blockArguments !== undefined) {
    for (let i=0, l=localNames.length; i<l; i++) {
      env.hooks.updateLocal(env, scope, localNames[i], blockArguments[i]);
    }
  }

  if (env.hooks.customSetupScope && hostOptions) {
    env.hooks.customUpdateScope(env, scope, hostOptions);
  }
}

/**
  Host Hook: bindShadowScope

  @param {Scope?} parentScope
  @return Scope

  Corresponds to rendering a new template into an existing
  render tree, but with a new top-level lexical scope. This
  template is called the "shadow root".

  If a shadow template invokes `{{yield}}`, it will render
  the block provided to the shadow root in the original
  lexical scope.

  ```hbs
  {{!-- post template --}}
  <p>{{props.title}}</p>
  {{yield}}

  {{!-- blog template --}}
  {{#post title="Hello world"}}
    <p>by {{byline}}</p>
    <article>This is my first post</article>
  {{/post}}

  {{#post title="Goodbye world"}}
    <p>by {{byline}}</p>
    <article>This is my last post</article>
  {{/post}}
  ```

  ```js
  helpers.post = function(params, hash, options) {
    options.template.yieldIn(postTemplate, { props: hash });
  };

  blog.render({ byline: "Yehuda Katz" });
  ```

  Produces:

  ```html
  <p>Hello world</p>
  <p>by Yehuda Katz</p>
  <article>This is my first post</article>

  <p>Goodbye world</p>
  <p>by Yehuda Katz</p>
  <article>This is my last post</article>
  ```

  In short, `yieldIn` creates a new top-level scope for the
  provided template and renders it, making the original block
  available to `{{yield}}` in that template.
*/
export function bindShadowScope(env /*, parentScope, shadowScope */) {
  return env.hooks.createFreshScope();
}

export function createChildScope(parent) {
  var scope = Object.create(parent);
  scope.locals = Object.create(parent.locals);
  scope.localPresent = Object.create(parent.localPresent);
  scope.blocks = Object.create(parent.blocks);
  return scope;
}

/**
  Host Hook: bindSelf

  @param {Scope} scope
  @param {any} self

  Corresponds to entering a template.

  This hook is invoked when the `self` value for a scope is ready to be bound.

  The host must ensure that child scopes reflect the change to the `self` in
  future calls to the `get` hook.
*/
export function bindSelf(env, scope, self) {
  scope.self = self;
}

export function updateSelf(env, scope, self) {
  env.hooks.bindSelf(env, scope, self);
}

/**
  Host Hook: bindLocal

  @param {Environment} env
  @param {Scope} scope
  @param {String} name
  @param {any} value

  Corresponds to entering a template with block arguments.

  This hook is invoked when a local variable for a scope has been provided.

  The host must ensure that child scopes reflect the change in future calls
  to the `get` hook.
*/
export function bindLocal(env, scope, name, value) {
  scope.localPresent[name] = true;
  scope.locals[name] = value;
}

export function updateLocal(env, scope, name, value) {
  env.hooks.bindLocal(env, scope, name, value);
}

/**
  Host Hook: bindBlock

  @param {Environment} env
  @param {Scope} scope
  @param {Function} block

  Corresponds to entering a shadow template that was invoked by a block helper with
  `yieldIn`.

  This hook is invoked with an opaque block that will be passed along
  to the shadow template, and inserted into the shadow template when
  `{{yield}}` is used. Optionally provide a non-default block name
  that can be targeted by `{{yield to=blockName}}`.
*/
export function bindBlock(env, scope, block, name='default') {
  scope.blocks[name] = block;
}

/**
  Host Hook: block

  @param {RenderNode} renderNode
  @param {Environment} env
  @param {Scope} scope
  @param {String} path
  @param {Array} params
  @param {Object} hash
  @param {Block} block
  @param {Block} elseBlock

  Corresponds to:

  ```hbs
  {{#helper param1 param2 key1=val1 key2=val2}}
    {{!-- child template --}}
  {{/helper}}
  ```

  This host hook is a workhorse of the system. It is invoked
  whenever a block is encountered, and is responsible for
  resolving the helper to call, and then invoke it.

  The helper should be invoked with:

  - `{Array} params`: the parameters passed to the helper
    in the template.
  - `{Object} hash`: an object containing the keys and values passed
    in the hash position in the template.

  The values in `params` and `hash` will already be resolved
  through a previous call to the `get` host hook.

  The helper should be invoked with a `this` value that is
  an object with one field:

  `{Function} yield`: when invoked, this function executes the
  block with the current scope. It takes an optional array of
  block parameters. If block parameters are supplied, HTMLBars
  will invoke the `bindLocal` host hook to bind the supplied
  values to the block arguments provided by the template.

  In general, the default implementation of `block` should work
  for most host environments. It delegates to other host hooks
  where appropriate, and properly invokes the helper with the
  appropriate arguments.
*/
export function block(morph, env, scope, path, params, hash, template, inverse, visitor) {
  if (handleRedirect(morph, env, scope, path, params, hash, template, inverse, visitor)) {
    return;
  }

  let options = optionsFor(template, inverse, env, scope, morph, visitor);
  let helper = env.hooks.lookupHelper(env, scope, path);
  env.hooks.invokeHelper(morph, env, scope, visitor, params, hash, helper, options.templates, thisFor(options.templates));
}

export function handleRedirect(morph, env, scope, path, params, hash, template, inverse, visitor) {
  if (!path) {
    return false;
  }

  var redirect = env.hooks.classify(env, scope, path);
  if (redirect) {
    switch(redirect) {
      case 'component': env.hooks.component(morph, env, scope, path, params, hash, {default: template, inverse}, visitor); break;
      case 'inline': env.hooks.inline(morph, env, scope, path, params, hash, visitor); break;
      case 'block': env.hooks.block(morph, env, scope, path, params, hash, template, inverse, visitor); break;
      default: throw new Error("Internal HTMLBars redirection to " + redirect + " not supported");
    }
    return true;
  }

  if (handleKeyword(path, morph, env, scope, params, hash, template, inverse, visitor)) {
    return true;
  }

  return false;
}

export function handleKeyword(path, morph, env, scope, params, hash, template, inverse, visitor) {
  var keyword = env.hooks.keywords[path];
  if (!keyword) { return false; }

  if (typeof keyword === 'function') {
    return keyword(morph, env, scope, params, hash, template, inverse, visitor);
  }

  if (keyword.willRender) {
    keyword.willRender(morph, env);
  }

  var lastState, newState;
  if (keyword.setupState) {
    lastState = shallowCopy(morph.state);
    newState = morph.state = keyword.setupState(lastState, env, scope, params, hash);
  }

  if (keyword.childEnv) {
    // Build the child environment...
    env = keyword.childEnv(morph.state, env);

    // ..then save off the child env builder on the render node. If the render
    // node tree is re-rendered and this node is not dirty, the child env
    // builder will still be invoked so that child dirty render nodes still get
    // the correct child env.
    morph.buildChildEnv = keyword.childEnv;
  }

  var firstTime = !morph.rendered;

  if (keyword.isEmpty) {
    var isEmpty = keyword.isEmpty(morph.state, env, scope, params, hash);

    if (isEmpty) {
      if (!firstTime) { clearMorph(morph, env, false); }
      return true;
    }
  }

  if (firstTime) {
    if (keyword.render) {
      keyword.render(morph, env, scope, params, hash, template, inverse, visitor);
    }
    morph.rendered = true;
    return true;
  }

  var isStable;
  if (keyword.isStable) {
    isStable = keyword.isStable(lastState, newState);
  } else {
    isStable = stableState(lastState, newState);
  }

  if (isStable) {
    if (keyword.rerender) {
      var newEnv = keyword.rerender(morph, env, scope, params, hash, template, inverse, visitor);
      env = newEnv || env;
    }
    validateChildMorphs(env, morph, visitor);
    return true;
  } else {
    clearMorph(morph, env, false);
  }

  // If the node is unstable, re-render from scratch
  if (keyword.render) {
    keyword.render(morph, env, scope, params, hash, template, inverse, visitor);
    morph.rendered = true;
    return true;
  }
}

function stableState(oldState, newState) {
  if (keyLength(oldState) !== keyLength(newState)) { return false; }

  for (var prop in oldState) {
    if (oldState[prop] !== newState[prop]) { return false; }
  }

  return true;
}

export function linkRenderNode(/* morph, env, scope, params, hash */) {
  return;
}

/**
  Host Hook: inline

  @param {RenderNode} renderNode
  @param {Environment} env
  @param {Scope} scope
  @param {String} path
  @param {Array} params
  @param {Hash} hash

  Corresponds to:

  ```hbs
  {{helper param1 param2 key1=val1 key2=val2}}
  ```

  This host hook is similar to the `block` host hook, but it
  invokes helpers that do not supply an attached block.

  Like the `block` hook, the helper should be invoked with:

  - `{Array} params`: the parameters passed to the helper
    in the template.
  - `{Object} hash`: an object containing the keys and values passed
    in the hash position in the template.

  The values in `params` and `hash` will already be resolved
  through a previous call to the `get` host hook.

  In general, the default implementation of `inline` should work
  for most host environments. It delegates to other host hooks
  where appropriate, and properly invokes the helper with the
  appropriate arguments.

  The default implementation of `inline` also makes `partial`
  a keyword. Instead of invoking a helper named `partial`,
  it invokes the `partial` host hook.
*/
export function inline(morph, env, scope, path, params, hash, visitor) {
  if (handleRedirect(morph, env, scope, path, params, hash, null, null, visitor)) {
    return;
  }

  let value, hasValue;
  if (morph.linkedResult) {
    value = env.hooks.getValue(morph.linkedResult);
    hasValue = true;
  } else {
    var options = optionsFor(null, null, env, scope, morph);

    var helper = env.hooks.lookupHelper(env, scope, path);
    var result = env.hooks.invokeHelper(morph, env, scope, visitor, params, hash, helper, options.templates, thisFor(options.templates));

    if (result && result.link) {
      morph.linkedResult = result.value;
      linkParams(env, scope, morph, '@content-helper', [morph.linkedResult], null);
    }

    if (result && 'value' in result) {
      value = env.hooks.getValue(result.value);
      hasValue = true;
    }
  }

  if (hasValue) {
    setContentForHelper(morph, value);
  }
}

function setContentForHelper(morph, value) {
  switch (typeof value) {
    case 'string': return morph.setContent(value);
    case 'object':
      if (value.string) { return morph.setContent(value); }
      if (value.nodeType) { return morph.setNode(value); }
      assert(false, "Helpers must return strings, safe strings, or nodes");
  }
}

export function keyword(path, morph, env, scope, params, hash, template, inverse, visitor)  {
  handleKeyword(path, morph, env, scope, params, hash, template, inverse, visitor);
}

export function invokeHelper(morph, env, scope, visitor, _params, _hash, helper, templates, context) {
  var params = normalizeArray(env, _params);
  var hash = normalizeObject(env, _hash);
  return { value: helper.call(context, params, hash, templates) };
}

const EMPTY_ARRAY = Object.freeze([]);

function normalizeArray(env, array) {
  if (array === null) { return EMPTY_ARRAY; }

  var out = new Array(array.length);

  for (var i=0, l=array.length; i<l; i++) {
    out[i] = env.hooks.getCellOrValue(array[i]);
  }

  return out;
}

const EMPTY_HASH = Object.freeze({});

function normalizeObject(env, object) {
  if (object === null) { return EMPTY_HASH; }

  var out = {};

  for (var prop in object)  {
    out[prop] = env.hooks.getCellOrValue(object[prop]);
  }

  return out;
}

export function classify(/* env, scope, path */) {
  return null;
}

export var keywords = {
  partial: function(morph, env, scope, params, hash, template, inverse, visitor) {
    env.hooks.partial(morph, env, scope, params[0], visitor);
    return true;
  },

  yield: function(morph, env, scope, params, hash, template, inverse, visitor) {
    // the current scope is provided purely for the creation of shadow
    // scopes; it should not be provided to user code.

    var to = env.hooks.getValue(hash.to) || 'default';
    var block = env.hooks.getBlock(scope, to);

    if (block) {
      block.invoke(new BlockOptions({
        env,
        morph,
        visitor,
        parentScope: scope,
        blockArguments: params,
        self: hash.self
      }));
    }
    return true;
  },

  hasBlock: function(morph, env, scope, params) {
    var name = env.hooks.getValue(params[0]) || 'default';
    return !!env.hooks.getBlock(scope, name);
  },

  hasBlockParams: function(morph, env, scope, params) {
    var name = env.hooks.getValue(params[0]) || 'default';
    var block = env.hooks.getBlock(scope, name);
    return !!(block && block.arity);
  }

};

/**
  Host Hook: partial

  @param {RenderNode} renderNode
  @param {Environment} env
  @param {Scope} scope
  @param {String} path

  Corresponds to:

  ```hbs
  {{partial "location"}}
  ```

  This host hook is invoked by the default implementation of
  the `inline` hook. This makes `partial` a keyword in an
  HTMLBars environment using the default `inline` host hook.

  It is implemented as a host hook so that it can retrieve
  the named partial out of the `Environment`. Helpers, in
  contrast, only have access to the values passed in to them,
  and not to the ambient lexical environment.

  The host hook should invoke the referenced partial with
  the ambient `self`.
*/
export function partial(morph, env, scope, path, visitor) {
  let template = env.partials[path];
  template.evaluate(morph, { env, scope, visitor });
}

/**
  Host hook: range

  @param {RenderNode} renderNode
  @param {Environment} env
  @param {Scope} scope
  @param {any} value

  Corresponds to:

  ```hbs
  {{content}}
  {{{unescaped}}}
  ```

  This hook is responsible for updating a render node
  that represents a range of content with a value.
*/
export function range(morph, env, scope, path, value, visitor) {
  if (handleRedirect(morph, env, scope, path, [value], {}, null, null, visitor)) {
    return;
  }

  value = env.hooks.getValue(value);
  morph.setContent(value);
}

/**
  Host hook: element

  @param {RenderNode} renderNode
  @param {Environment} env
  @param {Scope} scope
  @param {String} path
  @param {Array} params
  @param {Hash} hash

  Corresponds to:

  ```hbs
  <div {{bind-attr foo=bar}}></div>
  ```

  This hook is responsible for invoking a helper that
  modifies an element.

  Its purpose is largely legacy support for awkward
  idioms that became common when using the string-based
  Handlebars engine.

  Most of the uses of the `element` hook are expected
  to be superseded by component syntax and the
  `attribute` hook.
*/
export function element(morph, env, scope, path, params, hash, visitor) {
  if (handleRedirect(morph, env, scope, path, params, hash, null, null, visitor)) {
    return;
  }

  var helper = env.hooks.lookupHelper(env, scope, path);
  if (helper) {
    env.hooks.invokeHelper(null, env, scope, null, params, hash, helper, { element: morph.element });
  }
}

/**
  Host hook: attribute

  @param {RenderNode} renderNode
  @param {Environment} env
  @param {String} name
  @param {any} value

  Corresponds to:

  ```hbs
  <div foo={{bar}}></div>
  ```

  This hook is responsible for updating a render node
  that represents an element's attribute with a value.

  It receives the name of the attribute as well as an
  already-resolved value, and should update the render
  node with the value if appropriate.
*/
export function attribute(morph, env, scope, name, value) {
  value = env.hooks.getValue(value);

  if (morph.lastValue !== value) {
    morph.setContent(value);
  }

  morph.lastValue = value;
}

export function subexpr(env, scope, helperName, params, hash) {
  var helper = env.hooks.lookupHelper(env, scope, helperName);
  var result = env.hooks.invokeHelper(null, env, scope, null, params, hash, helper, {});
  if (result && 'value' in result) { return env.hooks.getValue(result.value); }
}

/**
  Host Hook: get

  @param {Environment} env
  @param {Scope} scope
  @param {String} path

  Corresponds to:

  ```hbs
  {{foo.bar}}
    ^

  {{helper foo.bar key=value}}
           ^           ^
  ```

  This hook is the "leaf" hook of the system. It is used to
  resolve a path relative to the current scope.
*/
export function get(env, scope, path) {
  if (path === '') {
    return scope.self;
  }

  var keys = path.split('.');
  var value = env.hooks.getRoot(scope, keys[0])[0];

  for (var i = 1; i < keys.length; i++) {
    if (value) {
      value = env.hooks.getChild(value, keys[i]);
    } else {
      break;
    }
  }

  return value;
}

export function getRoot(scope, key) {
  if (scope.localPresent[key]) {
    return [scope.locals[key]];
  } else if (scope.self) {
    return [scope.self[key]];
  } else {
    return [undefined];
  }
}

export function getBlock(scope, key) {
  return scope.blocks[key];
}

export function getChild(value, key) {
  return value[key];
}

export function getValue(reference) {
  return reference;
}

export function getCellOrValue(reference) {
  return reference;
}

export function component(morph, env, scope, tagName, params, attrs, templates, visitor) {
  if (env.hooks.hasHelper(env, scope, tagName)) {
    return env.hooks.block(morph, env, scope, tagName, params, attrs, templates.default, templates.inverse, visitor);
  }

  componentFallback(morph, env, scope, tagName, attrs, templates.default);
}

export function concat(env, params) {
  var value = "";
  for (var i = 0, l = params.length; i < l; i++) {
    value += env.hooks.getValue(params[i]);
  }
  return value;
}

function componentFallback(morph, env, scope, tagName, attrs, template, visitor) {
  let block = morph.state.block;

  if (!block) {
    let elementTemplate = manualElement(tagName, attrs, template.isEmpty);
    let childScope = env.hooks.createChildScope(scope);
    env.hooks.bindBlock(env, childScope, new Block({ scope, template }));

    morph.state.block = block = new Block({ scope: childScope, template: elementTemplate });
  }

  block.invoke(new BlockOptions({ env, morph, visitor }));
}

export function hasHelper(env, scope, helperName) {
  return env.helpers[helperName] !== undefined;
}

export function lookupHelper(env, scope, helperName) {
  return env.helpers[helperName];
}

export function bindScope(/* env, scope */) {
  // this function is used to handle host-specified extensions to scope
  // other than `self`, `locals` and `block`.
}

export function updateScope(env, scope) {
  env.hooks.bindScope(env, scope);
}

export default {
  // fundamental hooks that you will likely want to override
  bindLocal: bindLocal,
  bindSelf: bindSelf,
  bindScope: bindScope,
  classify: classify,
  component: component,
  concat: concat,
  createFreshScope: createFreshScope,
  getChild: getChild,
  getRoot: getRoot,
  getBlock: getBlock,
  getValue: getValue,
  getCellOrValue: getCellOrValue,
  keywords: keywords,
  linkRenderNode: linkRenderNode,
  partial: partial,
  subexpr: subexpr,

  // fundamental hooks with good default behavior
  bindBlock,
  bindShadowScope,
  updateLocal,
  updateSelf,
  updateScope,
  createChildScope,
  setupScope,
  hasHelper,
  lookupHelper,
  invokeHelper,
  customSetupScope: null,
  customUpdateScope: null,
  cleanupRenderNode: null,
  destroyRenderNode: null,
  willCleanupTree: null,
  didCleanupTree: null,
  willRenderNode: null,
  didRenderNode: null,

  // derived hooks
  attribute,
  block,
  createScope,
  element,
  get,
  inline,
  range,
  keyword
};
