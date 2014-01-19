// Sexprs are recursively evaluated at RESOLVE time and the
// return value of the sexpr helper is passed in to the parent helper.
function evaluateSexprs(context, params, types, helpers) {
  var sexprSpec, i, len;
  for (i = 0, len = params.length; i < len; ++i) {
    if (types[i] === 'sexpr') {
      sexprSpec = params[i];
      sexprSpec[2].helpers = helpers; // TODO seems like this should be compiled in, no?
      params[i] = helpers.RESOLVE(context, sexprSpec[0], sexprSpec[1], sexprSpec[2]);
    }
  }
}

function evaluateHashSexprs(context, hash, hashTypes, helpers) {
  var k, sexprSpec;
  for (k in hash) {
    if (hash.hasOwnProperty(k) && hashTypes[k] === 'sexpr') {
      sexprSpec = hash[k];
      sexprSpec[2].helpers = helpers; // TODO seems like this should be compiled in, no?
      hash[k] = helpers.RESOLVE(context, sexprSpec[0], sexprSpec[1], sexprSpec[2]);
    }
  }
}

export function RESOLVE(context, path, params, options) {
  var helper = options.helpers[path];

  // TODO: use something like RESOLVE_HELPER to allow late-binding.
  if (helper) {

    evaluateSexprs(context, params, options.types, options.helpers);
    evaluateHashSexprs(context, options.hash, options.hashTypes, options.helpers);

    var ret = helper(context, params, options);
    if (ret && options.placeholder) {
      options.placeholder.appendText(ret);
    }
    return ret;
  } else {
    var value = context[path];

    if (options.escaped) {
      options.placeholder.appendText(value);
    } else {
      options.placeholder.appendHTML(value);
    }
  }
}

export function RESOLVE_IN_ATTR(context, path, params, options) {
  var helpers = options.helpers,
      helper = helpers[path];

  if (helper) {
    return helper(context, params, options);
  } else {
    return context[path];
  }
}

export function ATTRIBUTE(context, name, params, options) {

  var helpers = options.helpers,
      buffer = [];

  params.forEach(function(node) {
    if (typeof node === 'string') {
      buffer.push(node);
    } else {
      var helperOptions = node[2];
      helperOptions.helpers = helpers;
      var ret = helpers.RESOLVE_IN_ATTR(context, node[0], node[1], helperOptions);
      if (ret) { buffer.push(ret); }
    }
  });

  if (buffer.length) {
    options.element.setAttribute(name, buffer.join(''));
  }
}
