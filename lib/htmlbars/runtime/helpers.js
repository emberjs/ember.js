export function RESOLVE(context, path, params, options) {
  var helper = options.helpers[path];
  if (helper) {
    var ret = helper(context, params, options);
    if (ret) {
      options.range.appendText(ret);
    }
  } else {
    if (path === 'testing') { debugger; }
    var value = context[path];

    options.range.clear();
    if (options.escaped) {
      options.range.appendText(value);
    } else {
      options.range.appendHTML(value);
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
  var helpers = options.helpers;

  params.forEach(function(node) {
    if (typeof node === 'string') {

    } else {
      var helperOptions = node[2];
      helperOptions.helpers = helpers;
      var ret = helpers.RESOLVE_IN_ATTR(context, node[0], node[1], helperOptions);
      if (ret) {
        options.element.setAttribute(name, ret);
      }
    }
  });
}