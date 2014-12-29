export function block(env, morph, context, path, params, hash, template, inverse) {
  var options = {
    morph: morph,
    template: template,
    inverse: inverse
  };

  var helper = lookupHelper(env, context, path);
  var value = helper.call(context, params, hash, options, env);

  morph.setContent(value);
}

export function inline(env, morph, context, path, params, hash) {
  var helper = lookupHelper(env, context, path);
  var value = helper.call(context, params, hash, { morph: morph }, env);

  morph.setContent(value);
}

export function content(env, morph, context, path) {
  var helper = lookupHelper(env, context, path);

  var value;
  if (helper) {
    value = helper.call(context, [], {}, { morph: morph }, env);
  } else {
    value = get(env, context, path);
  }

  morph.setContent(value);
}

export function element(env, domElement, context, path, params, hash) {
  var helper = lookupHelper(env, context, path);
  if (helper) {
    helper.call(context, params, hash, { element: domElement }, env);
  }
}

export function attribute(env, attrMorph, domElement, name, value) {
  attrMorph.setContent(value);
}

export function subexpr(env, context, helperName, params, hash) {
  var helper = lookupHelper(env, context, helperName);
  if (helper) {
    return helper.call(context, params, hash, {}, env);
  } else {
    return get(env, context, helperName);
  }
}

export function get(env, context, path) {
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
  var helper = lookupHelper(env, context, tagName);

  var value;
  if (helper) {
    var options = {
      morph: morph,
      template: template
    };

    value = helper.call(context, [], attrs, options, env);
  } else {
    value = componentFallback(env, morph, context, tagName, attrs, template);
  }

  morph.setContent(value);
}

export function concat(env, params) {
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
  element.appendChild(template.render(context, env, morph.contextualElement));
  return element;
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
