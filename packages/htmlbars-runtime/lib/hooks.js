import render from "./render";

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
    raw: template,
    render: function(self, env, options, blockArguments) {
      var scope = env.hooks.createScope(null, template.arity);
      env.hooks.bindSelf(scope, self);
      return render(template, env, scope, options, blockArguments);
    }
  };
}

export function wrapForHelper(template, yielded) {
  if (template === null) { return null;  }

  return {
    arity: template.arity,
    yield: yieldArgs,
    withLayout: withLayout,

    render: function(self, blockArguments) {
      yieldArgs(blockArguments);
      yielded.self = self;
    }
  };

  function withLayout(layoutTemplate, self) {
    yielded.self = self;
    yielded.layout = layoutTemplate;
    yielded.template = template;
  }

  function yieldArgs(blockArguments) {
    if (blockArguments !== undefined) {
      yielded.blockArguments = blockArguments;
    }

    yielded.template = template;
  }
}

function optionsFor(template, inverse) {
  var yielded = { self: undefined, blockArguments: null, template: null, layout: null };

  var templates = {
    template: wrapForHelper(template, yielded),
    inverse: wrapForHelper(inverse, yielded)
  };

  return { templates: templates, yielded: yielded };
}

function thisFor(options) {
  return { yield: options.template.yield, withLayout: options.template.withLayout };
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
export function createScope(parentScope) {
  var scope;

  if (parentScope) {
    scope = createObject(parentScope);
    scope.locals = createObject(parentScope.locals);
  } else {
    scope = { self: null, block: null, locals: {} };
  }

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
export function block(morph, env, scope, path, params, hash, template, inverse) {
  var state = morph.state;

  var options = optionsFor(template, inverse);

  var helper = env.hooks.lookupHelper(env, scope, path);
  helper.call(thisFor(options.templates), params, hash, options.templates);

  if (state.lastResult && isStable(options.yielded, state.lastYielded)) {
    state.lastResult.revalidate(options.yielded.self, options.yielded.blockArguments);
  } else {
    state.lastResult = applyYieldedTemplate(options.yielded, env, scope, morph);
    state.lastYielded = options.yielded;
  }
}

function isStable(yielded, lastYielded) {
  if (yielded.layout && !lastYielded.layout) { return false; }

  if (yielded.layout) {
    return isStableLayout(yielded, lastYielded);
  } else {
    return isStableTemplate(yielded, lastYielded);
  }
}

function isStableTemplate(yielded, lastYielded) {
  return yielded.template === lastYielded.template;
}

function isStableLayout(yielded, lastYielded) {
  return isStableTemplate(yielded, lastYielded) &&
         yielded.layout === lastYielded.layout;
}

// Block helpers can choose to call `yield` or `yieldWithLayout`. The choice of
// which template to render and whether a layout was chosen is recorded in the
// `yielded` object.
//
// For example, if a helper calls `this.yield()`, the `yielded` structure
// looks like:
//
// ```
// { template: passedTemplate, layout: null, blockArguments: null, self: undefined }
// ```
//
// If a helper calls `this.yieldWithLayout(layout, { title: "Hello" }), the
// structure looks like:
//
// ```
// {
//   template: passedTemplate,
//   layout: layout,
//   blockArguments: null,
//   self: { title: "Hello" }
// }
// ```
//
// This function takes that structure, sets up the correct scopes for each
// template, and invokes the templates.
//
// When a template is being revalidated, this code will also determine
// whether the previously rendered template is still stable or whether
// it needs to be built from scratch. In general, a template needs to be
// re-rendered from scratch only if the helper switches between the
// primary template and the inverse, or if it selects a different layout
// across runs.
function applyYieldedTemplate(yielded, env, parentScope, morph) {
  var template = yielded.template;
  if (!template) { return; }

  if (yielded.layout) {
    var layoutScope = scopeForYieldedTemplate(env, null, yielded);
    env.hooks.bindBlock(env, layoutScope, blockToYield);

    // Render the layout with the block available
    return render(yielded.layout.raw, env, layoutScope, { renderNode: morph });
  } else {
    var scope = scopeForYieldedTemplate(env, parentScope, yielded);

    // Render the template that was selected by the helper
    return renderTemplate(morph, scope, yielded.blockArguments);
  }

  function renderTemplate(renderNode, scope, blockArguments) {
    return render(template, env, scope, { renderNode: renderNode }, blockArguments);
  }

  function blockToYield(blockArguments, renderNode) {
    var state = renderNode.state;

    if (state.lastResult) {
      state.lastResult.revalidate(parentScope.self, blockArguments);
    } else {
      var scope = parentScope;

      // Since a yielded template shares a `self` with its original context,
      // we only need to create a new scope if the template has block parameters
      if (template.arity) {
        scope = env.hooks.createScope(parentScope, template.arity);
      }

      state.lastResult = renderTemplate(renderNode, scope, blockArguments);
    }
  }
}

// This function takes a `yielded` structure and creates a new scope for the
// template that will be rendered. If the call to `yield` did not supply a
// `self` and the template did not have block arguments, the original scope
// is shared.
//
// Otherwise, this function asks the host to create a new child scope.
function scopeForYieldedTemplate(env, parentScope, yielded) {
  var scope = parentScope;

  if (parentScope === null || yielded.template.arity || yielded.self !== undefined) {
    scope = env.hooks.createScope(scope, yielded.template.arity);
  }

  if (yielded.self !== undefined) {
    env.hooks.bindSelf(scope, yielded.self);
  }

  return scope;
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
export function inline(morph, env, scope, path, params, hash) {
  var state = morph.state;
  var value;

  if (path in env.hooks.keywords) {
    env.hooks.keywords[path](morph, env, scope, params, hash);
    return;
  }

  var helper = env.hooks.lookupHelper(env, scope, path);
  value = helper(params, hash, {});

  if (state.lastValue !== value) {
    morph.setContent(value);
  }

  state.lastValue = value;
}

export var keywords = {
  partial: function(morph, env, scope, params) {
    var value = env.hooks.partial(morph, env, scope, params[0]);
    morph.setContent(value);
  },

  yield: function(morph, env, scope, params) {
    scope.block(params, morph);
  }
};

function isHelper(env, scope, path) {
  return (path in env.hooks.keywords) || hasHelper(env, scope, path);
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
export function content(morph, env, scope, path) {
  if (isHelper(env, scope, path)) {
    return env.hooks.inline(morph, env, scope, path, [], {});
  } else {
    var value = env.hooks.get(env, scope, path);
    return env.hooks.range(morph, env, value);
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
export function range(morph, env, value) {
  var state = morph.state;

  if (state.lastValue !== value) {
    morph.setContent(value);
  }

  state.lastValue = value;
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
export function element(morph, env, scope, path, params, hash) {
  var helper = lookupHelper(env, scope, path);
  if (helper) {
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
export function attribute(morph, env, name, value) {
  var state = morph.state;

  if (state.lastValue !== value) {
    morph.setContent(value);
  }

  state.lastValue = value;
}

export function subexpr(env, scope, helperName, params, hash) {
  var helper = lookupHelper(env, scope, helperName);
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

export function component(morph, env, scope, tagName, attrs, template) {
  if (isHelper(env, scope, tagName)) {
    return env.hooks.block(morph, env, scope, tagName, [], attrs, template, null);
  }

  componentFallback(morph, env, scope, tagName, attrs, template);
}

export function concat(env, params) {
  var value = "";
  for (var i = 0, l = params.length; i < l; i++) {
    value += params[i];
  }
  return value;
}

function componentFallback(morph, env, scope, tagName, attrs, template) {
  var element = env.dom.createElement(tagName);
  for (var name in attrs) {
    element.setAttribute(name, attrs[name]);
  }
  var fragment = render(template, env, scope, {}).fragment;
  element.appendChild(fragment);
  morph.setNode(element);
}

export function hasHelper(env, scope, helperName) {
  return helperName in env.helpers;
}

export function lookupHelper(env, scope, helperName) {
  return env.helpers[helperName];
}

// IE8 does not have Object.create, so use a polyfill if needed.
// Polyfill based on Mozilla's (MDN)
export function createObject(obj) {
  if (typeof Object.create === 'function') {
    return Object.create(obj);
  } else {
    var Temp = function() {};
    Temp.prototype = obj;
    return new Temp();
  }
}

export default {
  keywords: keywords,
  createScope: createScope,
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
};
