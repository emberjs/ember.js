import SafeString from 'handlebars/safe-string';

export function CONTENT(placeholder, helperName, context, params, options) {
  var value, helper = this.LOOKUP_HELPER(helperName, context, options);
  if (helper) {
    value = helper(context, params, options);
  } else {
    value = this.SIMPLE(context, helperName, options);
  }
  if (!options.escaped) {
    value = new SafeString(value);
  }
  placeholder.replace(value);
}

export function ELEMENT(element, helperName, context, params, options) {
  var helper = this.LOOKUP_HELPER(helperName, context, options);
  if (helper) {
    options.element = element;
    helper(context, params, options);
  }
}

export function ATTRIBUTE(context, params, options) {
  for (var i = 1, l = params.length; i < l; ++i) {
    if (options.types[i] === 'id') {
      params[i] = this.SIMPLE(context, params[i], options);
    }
  }

  options.element.setAttribute(params[0], params.slice(1).join(''));
}

export function SUBEXPR(helperName, context, params, options) {
  var helper = this.LOOKUP_HELPER(helperName, context, options);
  if (helper) {
    return helper(context, params, options);
  } else {
    return this.SIMPLE(context, helperName, options);
  }
}

export function LOOKUP_HELPER(helperName, context, options) {
  if (helperName === 'ATTRIBUTE') {
    return this.ATTRIBUTE;
  }
}

export function SIMPLE(context, name, options) {
  return context[name];
}

