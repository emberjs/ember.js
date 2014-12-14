export function block(morph, context, path, params, hash, template, inverse, env) {
  var options = {
    morph: morph,
    template: template,
    inverse: inverse
  };

  var helper = lookupHelper(context, path, env);
  var value = helper.call(context, params, hash, options, env);

  morph.update(value);
}

export function inline(morph, context, path, params, hash, env) {
  var helper = lookupHelper(context, path, env);
  var value = helper.call(context, params, hash, { morph: morph }, env);

  morph.update(value);
}

export function content(morph, context, path, env) {
  var helper = lookupHelper(context, path, env);

  var value;
  if (helper) {
    value = helper.call(context, [], {}, { morph: morph }, env);
  } else {
    value = get(context, path);
  }

  morph.update(value);
}

export function element(domElement, context, path, params, hash, env) {
  var helper = lookupHelper(context, path, env);
  if (helper) {
    helper.call(context, params, hash, { element: domElement }, env);
  }
}

export function attribute(domElement, name, value) {
  if (value === null) {
    domElement.removeAttribute(name);
  } else {
    domElement.setAttribute(name, value);
  }
}

export function subexpr(helperName, context, params, hash, options, env) {
  var helper = lookupHelper(context, helperName, env);
  if (helper) {
    return helper.call(context, params, hash, options, env);
  } else {
    return get(context, helperName, options);
  }
}

export function get(context, path) {
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

export function set(context, name, value) {
  context[name] = value;
}

export function component(morph, context, tagName, attrs, template, env) {
  var helper = lookupHelper(context, tagName, env);

  var value;
  if (helper) {
    var options = {
      morph: morph,
      template: template
    };

    value = helper.call(context, [], attrs, options, env);
  } else {
    value = componentFallback(morph, context, tagName, attrs, template, env);
  }
  morph.update(value);
}

export function concat(params) {
  var value = "";
  for (var i = 0, l = params.length; i < l; i++) {
    value += params[i];
  }
  return value;
}

function componentFallback(morph, context, tagName, attrs, template, env) {
  var element = env.dom.createElement(tagName);
  for (var name in attrs) {
    element.setAttribute(name, attrs[name]);
  }
  element.appendChild(template.render(context, env, morph.contextualElement));
  return element;
}

function lookupHelper(context, helperName, env) {
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
