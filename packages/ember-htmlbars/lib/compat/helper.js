import merge from "ember-metal/merge";
import helpers from "ember-htmlbars/helpers";

function HandlebarsCompatibleHelper(fn) {
  this.helperFunction = function helperFunc(params, hash, options, env) {
    var handlebarsOptions = {};
    merge(handlebarsOptions, options);
    merge(handlebarsOptions, env);

    var args = options._raw.params;
    args.push(handlebarsOptions);

    var result = fn.apply(this, args);

    options.morph.update(result);
  };

  this.isHTMLBars = true;
}

HandlebarsCompatibleHelper.prototype = {
  preprocessArguments: function(view, params, hash, options, env) {
    options._raw = {
      params: params.slice(),
      hash: merge({}, hash)
    };
  }
};

export function registerHandlebarsCompatibleHelper(name, value) {
  helpers[name] = new HandlebarsCompatibleHelper(value);
}

export default HandlebarsCompatibleHelper;
