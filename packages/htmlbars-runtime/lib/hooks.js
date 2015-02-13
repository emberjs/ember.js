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
    blockParams: template.blockParams,
    render: function(self, env, options, blockArguments) {
      var scope = env.hooks.createScope(null, template.blockParams);
      scope.self = self;
      return render(template, env, scope, options, blockArguments);
    }
  };
}

export function wrapForHelper(template, env, originalScope, options) {
  if (template === null) { return null;  }

  return {
    isHTMLBars: true,
    blockParams: template.blockParams,

    yield: function(blockArguments) {
      var scope = originalScope;

      if (blockArguments !== undefined) {
        scope = env.hooks.createScope(originalScope, template.blockParams);
      }

      return render(template, env, scope, options, blockArguments);
    },

    render: function(newSelf, blockArguments) {
      var scope = originalScope;
      if (newSelf !== originalScope.self || blockArguments !== undefined) {
        scope = env.hooks.createScope(originalScope, template.blockParams);
        scope.self = newSelf;
      }

      return render(template, env, scope, options, blockArguments);
    }
  };
}

function optionsFor(morph, env, scope, template, inverse) {
  var options = {
    renderNode: morph,
    env: env,
    template: null,
    inverse: null
  };

  options.template = wrapForHelper(template, env, scope, options);
  options.inverse = wrapForHelper(inverse, env, scope, options);

  return options;
}

function thisFor(options) {
  return { yield: options.template.yield };
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
export function createScope(parentScope, localVariables) {
  var scope;

  if (parentScope) {
    scope = createObject(parentScope);
    scope.locals = createObject(parentScope.locals);
  } else {
    scope = { self: null, locals: {} };
  }

  for (var i=0, l=localVariables.length; i<l; i++) {
    scope.locals[localVariables[i]] = null;
  }

  return scope;
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

  if (morph.isDirty) {
    var options = optionsFor(morph, env, scope, template, inverse);

    var helper = lookupHelper(env, scope, path);
    var result = helper.call(thisFor(options), params, hash, options);

    if (result === undefined && state.lastResult) {
      state.lastResult.revalidate(scope.self);
    } else if (result !== undefined) {
      state.lastResult = result;
    }
  } else {
    state.lastResult.revalidate(scope.self);
  }

  morph.isDirty = false;
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
  if (morph.isDirty) {
    var state = morph.state;
    var value;

    if (path === 'partial') {
      value = env.hooks.partial(morph, env, scope, params[0]);
    } else {
      var helper = lookupHelper(env, scope, path);
      value = helper(params, hash, { renderNode: morph });
    }

    if (state.lastValue !== value) {
      morph.setContent(value);
    }

    state.lastValue = value;
    morph.isDirty = false;
  }
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
  ```

  This hook is responsible for updating a render node
  that represents an area of text with a value.

  Ideally, this hook would be refactored so it did not
  combine both the responsibility for identifying whether
  the path represented a helper as well as updating the
  render node.
*/
export function content(morph, env, scope, path) {
  if (morph.isDirty) {
    var state = morph.state;
    var helper = lookupHelper(env, scope, path);

    var value;
    if (helper) {
      value = helper([], {}, { renderNode: morph });
    } else {
      value = env.hooks.get(morph, env, scope, path);
    }

    if (state.lastValue !== value) {
      morph.setContent(value);
    }

    state.lastValue = value;
    morph.isDirty = false;
  }
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
  if (morph.isDirty) {
    var helper = lookupHelper(env, scope, path);
    if (helper) {
      helper(params, hash, { element: morph.element });
    }

    morph.isDirty = false;
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
  if (morph.isDirty) {
    var state = morph.state;

    if (state.lastValue !== value) {
      morph.setContent(value);
    }

    state.lastValue = value;
    morph.isDirty = false;
  }
}

export function subexpr(morph, env, scope, helperName, params, hash) {
  if (!morph.isDirty) { return; }

  var helper = lookupHelper(env, scope, helperName);
  if (helper) {
    return helper(params, hash, {});
  } else {
    return env.hooks.get(morph, env, scope, helperName);
  }
}

/**
  Host Hook: get

  @param {RenderNode} renderNode
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

  NOTE: This should be refactored into three hooks: splitting
  the path into parts, looking up the first part on the scope,
  and resolving the remainder a piece at a time. It would also
  be useful to have a "classification" hook that handles
  classifying a name as either a helper or value.
*/
export function get(morph, env, scope, path) {
  if (!morph.isDirty) { return; }

  if (path === '') {
    return scope.self;
  }

  var keys = path.split('.');
  var value = (keys[0] in scope.locals) ? scope.locals : scope.self;

  for (var i = 0; i < keys.length; i++) {
    if (value) {
      value = value[keys[i]];
    } else {
      break;
    }
  }
  return value;
}

export function bindLocal(env, scope, name, value) {
  scope.locals[name] = value;
}

export function component(morph, env, scope, tagName, attrs, template) {
  if (morph.isDirty) {
    var helper = lookupHelper(env, scope, tagName);
    if (helper) {
      var options = optionsFor(morph, env, scope, template, null);
      helper.call(thisFor(options), [], attrs, options);
    } else {
      componentFallback(morph, env, scope, tagName, attrs, template);
    }

    morph.isDirty = false;
  }
}

export function concat(morph, env, params) {
  if (!morph.isDirty) { return; }

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

function lookupHelper(env, scope, helperName) {
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
  createScope: createScope,
  content: content,
  block: block,
  inline: inline,
  partial: partial,
  component: component,
  element: element,
  attribute: attribute,
  subexpr: subexpr,
  concat: concat,
  get: get,
  bindLocal: bindLocal
};
