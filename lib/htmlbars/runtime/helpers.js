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