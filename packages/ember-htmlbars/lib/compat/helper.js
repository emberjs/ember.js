import merge from "ember-metal/merge";
import helpers from "ember-htmlbars/helpers";

export function makeHandlebarsCompatibleHelper(fn) {
  function helperFunc(params, hash, options, env) {
    var handlebarsOptions = {};
    merge(handlebarsOptions, options);
    merge(handlebarsOptions, env);

    var args = options._raw.params;
    args.push(handlebarsOptions);

    var result = fn.apply(this, args);
    options.morph.update(result);
  }

  helperFunc._preprocessArguments = function(view, params, hash, options, env) {
    options._raw = {
      params: params.slice(),
      hash: merge({}, hash)
    };
  };

  helperFunc._isHTMLBars = true;

  return helperFunc;
}

export function registerHandlebarsCompatibleHelper(name, value) {
  helpers[name] = makeHandlebarsCompatibleHelper(value);
}
