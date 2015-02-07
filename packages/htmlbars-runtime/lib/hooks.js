import render from "./render";

export function wrap(template) {
  if (template === null) { return null;  }

  return {
    isHTMLBars: true,
    blockParams: template.blockParams,
    render: function(context, env, options, blockArguments) {
      return render(template, context, env, options, blockArguments);
    }
  };
}

export function wrapForHelper(template, options, env) {
  if (template === null) { return null;  }

  return {
    isHTMLBars: true,
    blockParams: template.blockParams,
    render: function(context, blockArguments) {
      return render(template, context, env, options, blockArguments);
    }
  };
}

function optionsFor(morph, env, template, inverse) {
  var options = {
    renderNode: morph,
    contextualElement: morph.contextualElement,
    env: env,
    template: null,
    inverse: null
  };

  options.template = wrapForHelper(template, options, env);
  options.inverse = wrapForHelper(inverse, options, env);

  return options;
}

export function block(env, morph, context, path, params, hash, template, inverse) {
  var state = morph.state;

  if (morph.isDirty) {
    var options = optionsFor(morph, env, template, inverse);

    var helper = lookupHelper(env, context, path);
    var result = helper.call(context, params, hash, options, env);

    if (result === undefined && state.lastResult) {
      state.lastResult.revalidate(this);
    } else if (result !== undefined) {
      state.lastResult = result;
    }
  } else {
    state.lastResult.revalidate(this);
  }

  morph.isDirty = false;
}

export function inline(env, morph, context, path, params, hash) {
  if (morph.isDirty) {
    var state = morph.state;
    var helper = lookupHelper(env, context, path);

    var value = helper.call(context, params, hash, { renderNode: morph }, env);

    if (state.lastValue !== value) {
      morph.setContent(value);
    }

    state.lastValue = value;
    morph.isDirty = false;
  }
}

export function content(env, morph, context, path) {
  if (morph.isDirty) {
    var state = morph.state;
    var helper = lookupHelper(env, context, path);

    var value;
    if (helper) {
      value = helper.call(context, [], {}, { renderNode: morph }, env);
    } else {
      value = env.hooks.get(env, morph, context, path);
    }

    if (state.lastValue !== value) {
      morph.setContent(value);
    }

    state.lastValue = value;
    morph.isDirty = false;
  }
}

export function element(env, morph, context, path, params, hash) {
  if (morph.isDirty) {
    var helper = lookupHelper(env, context, path);
    if (helper) {
      helper.call(context, params, hash, { element: morph.element }, env);
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

export function subexpr(env, morph, context, helperName, params, hash) {
  if (!morph.isDirty) { return; }

  var helper = lookupHelper(env, context, helperName);
  if (helper) {
    return helper.call(context, params, hash, {}, env);
  } else {
    return env.hooks.get(env, morph, context, helperName);
  }
}

export function get(env, morph, context, path) {
  if (!morph.isDirty) { return; }

  if (path === '') {
    return context;
  }

  var keys = path.split('.');
  var value = context;
  for (var i = 0; i < keys.length; i++) {
    if (value) {
      value = value[keys[i]];
    } else {
      break;
    }
  }
  return value;
}

export function set(env, context, name, value) {
  context[name] = value;
}

export function component(env, morph, context, tagName, attrs, template) {
  if (morph.isDirty) {
    var helper = lookupHelper(env, context, tagName);
    if (helper) {
      var options = optionsFor(morph, env, template, null);
      helper.call(context, [], attrs, options, env);
    } else {
      componentFallback(env, morph, context, tagName, attrs, template);
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

function componentFallback(env, morph, context, tagName, attrs, template) {
  var element = env.dom.createElement(tagName);
  for (var name in attrs) {
    element.setAttribute(name, attrs[name]);
  }
  var fragment = render(template, context, env, { contextualElement: morph.contextualElement }).fragment;
  element.appendChild(fragment);
  morph.setNode(element);
}

function lookupHelper(env, context, helperName) {
  return env.helpers[helperName];
}

export default {
  content: content,
  block: block,
  inline: inline,
  component: component,
  element: element,
  attribute: attribute,
  subexpr: subexpr,
  concat: concat,
  get: get,
  set: set
};
