import render from "./render";

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
    contextualElement: morph.contextualElement,
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

export function partial(renderNode, env, scope, path) {
  var template = env.partials[path];
  return template.render(scope.self, env, { contextualElement: renderNode.contextualElement }).fragment;
}

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

export function element(morph, env, scope, path, params, hash) {
  if (morph.isDirty) {
    var helper = lookupHelper(env, scope, path);
    if (helper) {
      helper(params, hash, { element: morph.element });
    }

    morph.isDirty = false;
  }
}

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
  var fragment = render(template, env, scope, { contextualElement: morph.contextualElement }).fragment;
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
