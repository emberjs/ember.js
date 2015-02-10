import render from "./render";

export function wrap(template) {
  if (template === null) { return null;  }

  return {
    isHTMLBars: true,
    blockParams: template.blockParams,
    render: function(self, env, options, blockArguments) {
      var scope = env.hooks.createScope(null, template.blockParams);
      scope.self = self;
      return render(template, scope, env, options, blockArguments);
    }
  };
}

export function wrapForHelper(template, originalScope, options, env) {
  if (template === null) { return null;  }

  return {
    isHTMLBars: true,
    blockParams: template.blockParams,

    yield: function(blockArguments) {
      var scope = originalScope;

      if (blockArguments !== undefined) {
        scope = env.hooks.createScope(originalScope, template.blockParams);
      }

      return render(template, scope, env, options, blockArguments);
    },

    render: function(newSelf, blockArguments) {
      var scope = originalScope;
      if (newSelf !== originalScope.self || blockArguments !== undefined) {
        scope = env.hooks.createScope(originalScope, template.blockParams);
        scope.self = newSelf;
      }

      return render(template, scope, env, options, blockArguments);
    }
  };
}

function optionsFor(morph, scope, env, template, inverse) {
  var options = {
    renderNode: morph,
    contextualElement: morph.contextualElement,
    env: env,
    template: null,
    inverse: null
  };

  options.template = wrapForHelper(template, scope, options, env);
  options.inverse = wrapForHelper(inverse, scope, options, env);

  return options;
}

export function createScope(parentScope, localVariables) {
  var scope;

  if (parentScope) {
    scope = Object.create(parentScope);
    scope.locals = Object.create(parentScope.locals);
  } else {
    scope = { self: null, locals: {} };
  }

  for (var i=0, l=localVariables.length; i<l; i++) {
    scope.locals[localVariables[i]] = null;
  }

  return scope;
}

export function block(env, morph, scope, path, params, hash, template, inverse) {
  var state = morph.state;

  if (morph.isDirty) {
    var options = optionsFor(morph, scope, env, template, inverse);

    var helper = lookupHelper(env, scope, path);
    var result = helper(params, hash, options, env);

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

export function inline(env, morph, scope, path, params, hash) {
  if (morph.isDirty) {
    var state = morph.state;
    var helper = lookupHelper(env, scope, path);

    var value = helper(params, hash, { renderNode: morph }, env);

    if (state.lastValue !== value) {
      morph.setContent(value);
    }

    state.lastValue = value;
    morph.isDirty = false;
  }
}

export function content(env, morph, scope, path) {
  if (morph.isDirty) {
    var state = morph.state;
    var helper = lookupHelper(env, scope, path);

    var value;
    if (helper) {
      value = helper([], {}, { renderNode: morph }, env);
    } else {
      value = env.hooks.get(env, morph, scope, path);
    }

    if (state.lastValue !== value) {
      morph.setContent(value);
    }

    state.lastValue = value;
    morph.isDirty = false;
  }
}

export function element(env, morph, scope, path, params, hash) {
  if (morph.isDirty) {
    var helper = lookupHelper(env, scope, path);
    if (helper) {
      helper(params, hash, { element: morph.element }, env);
    }

    morph.isDirty = false;
  }
}

export function attribute(env, morph, name, value) {
  if (morph.isDirty) {
    var state = morph.state;

    if (state.lastValue !== value) {
      morph.setContent(value);
    }

    state.lastValue = value;
    morph.isDirty = false;
  }
}

export function subexpr(env, morph, scope, helperName, params, hash) {
  if (!morph.isDirty) { return; }

  var helper = lookupHelper(env, scope, helperName);
  if (helper) {
    return helper(params, hash, {}, env);
  } else {
    return env.hooks.get(env, morph, scope, helperName);
  }
}

export function get(env, morph, scope, path) {
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

export function component(env, morph, scope, tagName, attrs, template) {
  if (morph.isDirty) {
    var helper = lookupHelper(env, scope, tagName);
    if (helper) {
      var options = optionsFor(morph, scope, env, template, null);
      helper([], attrs, options, env);
    } else {
      componentFallback(env, morph, scope, tagName, attrs, template);
    }

    morph.isDirty = false;
  }
}

export function concat(env, morph, params) {
  if (!morph.isDirty) { return; }

  var value = "";
  for (var i = 0, l = params.length; i < l; i++) {
    value += params[i];
  }
  return value;
}

function componentFallback(env, morph, scope, tagName, attrs, template) {
  var element = env.dom.createElement(tagName);
  for (var name in attrs) {
    element.setAttribute(name, attrs[name]);
  }
  var fragment = render(template, scope, env, { contextualElement: morph.contextualElement }).fragment;
  element.appendChild(fragment);
  morph.setNode(element);
}

function lookupHelper(env, scope, helperName) {
  return env.helpers[helperName];
}

export default {
  createScope: createScope,
  content: content,
  block: block,
  inline: inline,
  component: component,
  element: element,
  attribute: attribute,
  subexpr: subexpr,
  concat: concat,
  get: get,
  bindLocal: bindLocal
};
