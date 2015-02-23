import render from "./render";
import MorphList from "../morph-range/morph-list";
import { createChildMorph } from "./render";
import { createObject } from "../htmlbars-util/object-utils";
import { visitChildren, validateChildMorphs } from "../htmlbars-util/morph-utils";

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

export function wrap(template) {
  if (template === null) { return null;  }

  return {
    isHTMLBars: true,
    arity: template.arity,
    revision: template.revision,
    raw: template,
    render: function(self, env, options, blockArguments) {
      var scope = env.hooks.createFreshScope();
      env.hooks.bindSelf(scope, self);
      return render(template, env, scope, options, blockArguments);
    }
  };
}

export function wrapForHelper(template, env, scope, morph, morphsToPrune, visitor) {
  if (template === null) {
    return {
      withLayout: yieldWithLayout(null, env, scope, morph, morphsToPrune, visitor)
    };
  }

  var yieldArgs = yieldTemplate(template, env, scope, morph, morphsToPrune, visitor);

  return {
    arity: template.arity,
    revision: template.revision,
    yield: yieldArgs,
    yieldItem: yieldItem(template, env, scope, morph, morphsToPrune, visitor),
    withLayout: yieldWithLayout(template, env, scope, morph, morphsToPrune, visitor),

    render: function(self, blockArguments) {
      yieldArgs(blockArguments, self);
    }
  };
}

function yieldTemplate(template, env, parentScope, morph, morphsToPrune, visitor) {
  return function(blockArguments, self) {
    morphsToPrune.clearMorph = null;
    var scope = parentScope;

    if (morph.lastYielded && isStableTemplate(template, morph.lastYielded)) {
      return morph.lastResult.revalidateWith(self, blockArguments, visitor);
    }

    // Check to make sure that we actually **need** a new scope, and can't
    // share the parent scope. Note that we need to move this check into
    // a host hook, because the host's notion of scope may require a new
    // scope in more cases than the ones we can determine statically.
    if (self !== undefined || parentScope === null || template.arity) {
      scope = env.hooks.createChildScope(parentScope);
    }

    if (self !== undefined) {
      env.hooks.bindSelf(scope, self);
    }

    morph.lastYielded = { self: self, template: template, layout: null };

    // Render the template that was selected by the helper
    morph.lastResult = render(template, env, scope, { renderNode: morph }, blockArguments);
  };
}

function yieldItem(template, env, parentScope, morph, morphsToPrune, visitor) {
  var currentMorph = null;
  var morphList = morph.morphList;
  if (morphList) {
    currentMorph = morphList.firstChildMorph;
    morphsToPrune.morphListStart = currentMorph;
  }

  return function(key, blockArguments) {
    if (typeof key !== 'string') {
      throw new Error("You must provide a string key when calling `yieldItem`; you provided " + key);
    }

    var morphList, morphMap;

    if (!morph.morphList) {
      morph.morphList = new MorphList();
      morph.morphMap = {};
      morph.setMorphList(morph.morphList);
    }

    morphList = morph.morphList;
    morphMap = morph.morphMap;

    if (currentMorph && currentMorph.key === key) {
      yieldTemplate(template, env, parentScope, currentMorph, morphsToPrune, visitor)(blockArguments);
      currentMorph = currentMorph.nextMorph;
    } else if (currentMorph && morphMap[key] !== undefined) {
      var foundMorph = morphMap[key];
      yieldTemplate(template, env, parentScope, foundMorph, morphsToPrune, visitor)(blockArguments);
      morphList.insertBeforeMorph(foundMorph, currentMorph);
    } else {
      var childMorph = createChildMorph(env.dom, morph);
      childMorph.key = key;
      morphMap[key] = childMorph;
      morphList.insertBeforeMorph(childMorph, currentMorph);
      yieldTemplate(template, env, parentScope, childMorph, morphsToPrune, visitor)(blockArguments);
    }

    morphsToPrune.morphListStart = currentMorph;
    morphsToPrune.clearMorph = null;
  };
}

function isStableTemplate(template, lastYielded) {
  return !lastYielded.layout && template === lastYielded.template;
}

function yieldWithLayout(template, env, parentScope, morph, morphsToPrune, visitor) {
  return function(layout, self) {
    morphsToPrune.clearMorph = null;
    var layoutScope = env.hooks.createFreshScope();

    if (morph.lastYielded && isStableLayout(template, layout, morph.lastYielded)) {
      return morph.lastResult.revalidateWith(self, [], visitor);
    }

    if (self !== undefined) {
      env.hooks.bindSelf(layoutScope, self);
    }

    env.hooks.bindBlock(env, layoutScope, blockToYield);

    morph.lastYielded = { self: self, template: template, layout: layout };

    // Render the layout with the block available
    morph.lastResult = render(layout.raw, env, layoutScope, { renderNode: morph });
  };

  function blockToYield(blockArguments, renderNode) {
    if (renderNode.lastResult) {
      renderNode.lastResult.revalidateWith(parentScope.self, blockArguments, visitor);
    } else {
      var scope = parentScope;

      // Since a yielded template shares a `self` with its original context,
      // we only need to create a new scope if the template has block parameters
      if (template.arity) {
        scope = env.hooks.createChildScope(parentScope);
      }

      renderNode.lastResult = render(template, env, scope, { renderNode: renderNode }, blockArguments);
    }
  }
}

function isStableLayout(template, layout, lastYielded) {
  return template === lastYielded.template && layout === lastYielded.layout;
}

function optionsFor(template, inverse, env, scope, morph, visitor) {
  var morphsToPrune = { morphListStart: null, clearMorph: morph };

  return {
    templates: {
      template: wrapForHelper(template, env, scope, morph, morphsToPrune, visitor),
      inverse: wrapForHelper(inverse, env, scope, morph, morphsToPrune, visitor)
    },
    morphsToPrune: morphsToPrune
  };
}

function thisFor(options) {
  return {
    yield: options.template.yield,
    yieldItem: options.template.yieldItem,
    withLayout: options.template.withLayout
  };
}

function linkParams(env, scope, morph, params, hash) {
  var isStable = env.hooks.linkRenderNode(morph, scope, params, hash);

  if (isStable) {
    morph.linkedParams = { params: params, hash: hash };
  }
}

/**
  Host Hook: createScope

  @param {Scope?} parentScope
  @param {Array<String>} localVariables
  @return Scope

  Corresponds to entering a new HTMLBars block.

  This hook is invoked when a block is entered with
  a new `self` or additional local variables.

  When invoked for a top-level template, the
  `parentScope` is `null`, and this hook should return
  a fresh Scope.

  When invoked for a child template, the `parentScope`
  is the scope for the parent environment, and
  `localVariables` is an array of names of new variable
  bindings that should be created for this scope.

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
  return { self: null, block: null, locals: {} };
}

export function createChildScope(parent) {
  var scope = createObject(parent);
  scope.locals = createObject(parent.locals);
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
export function bindSelf(scope, self) {
  scope.self = self;
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
  scope.locals[name] = value;
}

/**
  Host Hook: bindBlock

  @param {Environment} env
  @param {Scope} scope
  @param {Function} block

  Corresponds to entering a layout that was invoked by a block helper with
  `yieldWithLayout`.

  This hook is invoked with an opaque block that will be passed along to the
  layout, and inserted into the layout when `{{yield}}` is used.
*/
export function bindBlock(env, scope, block) {
  scope.block = block;
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
  if (handleKeyword(path, morph, env, scope, params, hash, template, inverse, visitor)) {
    return;
  }

  var options = optionsFor(template, inverse, env, scope, morph, visitor);

  var helper = env.hooks.lookupHelper(env, scope, path);
  linkParams(env, scope, morph, params, hash);
  params = normalizeArray(env, params);
  hash = normalizeObject(env, hash);
  helper.call(thisFor(options.templates), params, hash, options.templates);

  var item = options.morphsToPrune.morphListStart;
  var toClear = options.morphsToPrune.clearMorph;
  var morphMap = morph.morphMap;

  while (item) {
    var next = item.nextMorph;
    delete morphMap[item.key];
    if (env.hooks.cleanup) { visitChildren([item], env.hooks.cleanup); }
    item.destroy();
    item = next;
  }

  if (toClear) {
    pruneMorph(toClear, env.hooks.cleanup);
  }
}

function pruneMorph(morph, cleanup) {
  if (cleanup) {
    visitChildren(morph.childNodes, cleanup);
  }

  // TODO: Deal with logical children that are not in the DOM tree
  morph.clear();
  morph.lastResult = null;
  morph.lastYielded = null;
}

function handleKeyword(path, morph, env, scope, params, hash, template, inverse, visitor) {
  var keyword = env.hooks.keywords[path];
  if (!keyword) { return false; }

  if (typeof keyword === 'function') {
    return keyword(morph, env, scope, params, hash, template, inverse, visitor);
  }

  if (keyword.willRender) {
    keyword.willRender(morph, env);
  }

  if (keyword.setupState) {
    keyword.setupState(morph.state, env, scope, params, hash);
  }

  var firstTime = !morph.lastResult;

  if (keyword.isEmpty) {
    var isEmpty = keyword.isEmpty(morph.state, env, scope, params, hash);

    if (isEmpty) {
      if (!firstTime) { pruneMorph(morph, env.hooks.cleanup); }
      return true;
    }
  }

  if (firstTime) {
    keyword.render(morph, env, scope, params, hash, template, inverse, visitor);
    return true;
  }

  if (keyword.isStable) {
    var isStable = keyword.isStable(morph.state, env, scope, params, hash);
    if (isStable) {
      validateChildMorphs(morph, visitor);
      return true;
    }
  }

  if (keyword.render) {
    keyword.render(morph, env, scope, params, hash, template, inverse, visitor);
    return true;
  }
}

export function linkRenderNode(/* morph, scope, params, hash */) {
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
  var value;

  if (handleKeyword(path, morph, env, scope, params, hash, null, null, visitor)) {
    return;
  }

  var options = optionsFor(null, null, env, scope, morph);

  var helper = env.hooks.lookupHelper(env, scope, path);
  linkParams(env, scope, morph, params, hash);
  params = normalizeArray(env, params);
  hash = normalizeObject(env, hash);
  value = helper.call(thisFor(options.templates), params, hash, options.templates);

  if (morph.lastValue !== value) {
    morph.setContent(value);
  }

  morph.lastValue = value;
}

function normalizeArray(env, array) {
  var out = new Array(array.length);

  for (var i=0, l=array.length; i<l; i++) {
    out[i] = env.hooks.getValue(array[i]);
  }

  return out;
}

function normalizeObject(env, object) {
  var out = {};

  for (var prop in object)  {
    out[prop] = env.hooks.getValue(object[prop]);
  }

  return out;
}

export var keywords = {
  partial: function(morph, env, scope, params) {
    var value = env.hooks.partial(morph, env, scope, params[0]);
    morph.setContent(value);
    return true;
  },

  yield: function(morph, env, scope, params) {
    scope.block(params, morph);
    return true;
  }
};

function isHelper(env, scope, path) {
  return (env.hooks.keywords[path] !== undefined) || hasHelper(env, scope, path);
}

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
export function partial(renderNode, env, scope, path) {
  var template = env.partials[path];
  return template.render(scope.self, env, {}).fragment;
}

/**
  Host hook: content

  @param {RenderNode} renderNode
  @param {Environment} env
  @param {Scope} scope
  @param {String} path

  Corresponds to:

  ```hbs
  {{content}}
  {{{unescaped}}}
  {{helper}}
  ```

  This hook is responsible for updating a render node
  that represents an area of text with a value.

  It is invoked for both helpers and content. The default
  implementation of this hook classifies the path name.

  If the path is a helper or a keyword, it invokes the `inline`
  hook. Otherwise, it invokes the `get` hook to get the value
  and then invokes the range hook with the value.
*/
export function content(morph, env, scope, path, visitor) {
  if (isHelper(env, scope, path)) {
    return env.hooks.inline(morph, env, scope, path, [], {}, visitor);
  } else {
    var value = env.hooks.get(env, scope, path);
    return env.hooks.range(morph, env, scope, value);
  }
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
export function range(morph, env, scope, value) {
  linkParams(env, scope, morph, [value], null);
  value = env.hooks.getValue(value);

  if (morph.lastValue !== value) {
    morph.setContent(value);
  }

  morph.lastValue = value;
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
export function element(morph, env, scope, path, params, hash /*, visitor */) {
  var helper = lookupHelper(env, scope, path);
  if (helper) {
    linkParams(env, scope, morph, params, hash);
    params = normalizeArray(env, params);
    hash = normalizeObject(env, hash);
    helper(params, hash, { element: morph.element });
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
  linkParams(env, scope, morph, [value], null);
  value = env.hooks.getValue(value);

  if (morph.lastValue !== value) {
    morph.setContent(value);
  }

  morph.lastValue = value;
}

export function subexpr(env, scope, helperName, params, hash) {
  var helper = lookupHelper(env, scope, helperName);
  params = normalizeArray(env, params);
  hash = normalizeObject(env, hash);
  return helper(params, hash, {});
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
  var value = env.hooks.getRoot(scope, keys[0]);

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
  return key in scope.locals ? scope.locals[key] : scope.self[key];
}

export function getChild(value, key) {
  return value[key];
}

export function getValue(value) {
  return value;
}

export function component(morph, env, scope, tagName, attrs, template, visitor) {
  if (isHelper(env, scope, tagName)) {
    return env.hooks.block(morph, env, scope, tagName, [], attrs, template, null, visitor);
  }

  componentFallback(morph, env, scope, tagName, attrs, template);
}

export function concat(env, params) {
  var value = "";
  for (var i = 0, l = params.length; i < l; i++) {
    value += env.hooks.getValue(params[i]);
  }
  return value;
}

function componentFallback(morph, env, scope, tagName, attrs, template) {
  var element = env.dom.createElement(tagName);
  linkParams(env, scope, morph, [], attrs);
  for (var name in attrs) {
    element.setAttribute(name, env.hooks.getValue(attrs[name]));
  }
  var fragment = render(template, env, scope, {}).fragment;
  element.appendChild(fragment);
  morph.setNode(element);
}

export function hasHelper(env, scope, helperName) {
  return env.helpers[helperName] !== undefined;
}

export function lookupHelper(env, scope, helperName) {
  return env.helpers[helperName];
}

export default {
  keywords: keywords,
  linkRenderNode: linkRenderNode,
  createScope: createScope,
  createFreshScope: createFreshScope,
  createChildScope: createChildScope,
  bindSelf: bindSelf,
  bindLocal: bindLocal,
  bindBlock: bindBlock,
  lookupHelper: lookupHelper,
  hasHelper: hasHelper,
  content: content,
  range: range,
  block: block,
  inline: inline,
  partial: partial,
  component: component,
  element: element,
  attribute: attribute,
  subexpr: subexpr,
  concat: concat,
  get: get,
  getRoot: getRoot,
  getChild: getChild,
  getValue: getValue,
  cleanup: null
};
