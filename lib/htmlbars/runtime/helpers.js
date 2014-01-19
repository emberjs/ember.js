export function RESOLVE(context, path, params, options) {
  var helper = options.helpers[path];
  if (helper) {
    var ret = helper(context, params, options);
    if (ret) {
      options.placeholder.appendText(ret);
    }
  } else {
    var value = context[path];

    options.placeholder.clear();
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
