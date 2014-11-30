import { concat } from "./helpers";

export function content(morph, path, context, params, hash, options, env) {
  var value, helper = lookupHelper(context, path, env);
  if (helper) {
    value = helper.call(context, params, hash, options, env);
  } else {
    value = get(context, path);
  }
  morph.update(value);
}

export function element(domElement, helperName, context, params, hash, options, env) {
  var helper = lookupHelper(context, helperName, env);
  if (helper) {
    helper.call(context, params, hash, options, env);
  }
}

export function attribute(domElement, attributeName, quoted, context, parts, options) {
  var attrValue;

  if (quoted) {
    attrValue = concat.call(context, parts, null, options);
  } else {
    attrValue = parts[0];
  }

  if (attrValue === null) {
    domElement.removeAttribute(attributeName);
  } else {
    domElement.setAttribute(attributeName, attrValue);
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

export function component(morph, tagName, context, hash, options, env) {
  var value, helper = lookupHelper(context, tagName, env);
  if (helper) {
    value = helper.call(context, null, hash, options, env);
  } else {
    value = componentFallback(morph, tagName, context, hash, options, env);
  }
  morph.update(value);
}

function componentFallback(morph, tagName, context, hash, options, env) {
  var element = env.dom.createElement(tagName);
  for (var name in hash) {
    element.setAttribute(name, hash[name]);
  }
  element.appendChild(options.template.render(context, env, morph.contextualElement));
  return element;
}

function lookupHelper(context, helperName, env) {
  return env.helpers[helperName];
}

export default {
  content: content,
  component: component,
  element: element,
  attribute: attribute,
  subexpr: subexpr,
  get: get,
  set: set
};
