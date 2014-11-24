import merge from "ember-metal/merge";
import helpers from "ember-htmlbars/helpers";
import View from "ember-views/views/view";
import Component from "ember-views/views/component";
import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import makeBoundHelper from "ember-htmlbars/compat/make-bound-helper";

var slice = [].slice;

function HandlebarsCompatibleHelper(fn) {
  this.helperFunction = function helperFunc(params, hash, options, env) {
    var handlebarsOptions = {};
    merge(handlebarsOptions, options);
    merge(handlebarsOptions, env);
    handlebarsOptions.hash = options._raw.hash;

    var args = options._raw.params;
    args.push(handlebarsOptions);

    return fn.apply(this, args);
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

export function handlebarsHelper(name, value) {
  Ember.assert("You tried to register a component named '" + name +
               "', but component names must include a '-'", !Component.detect(value) || name.match(/-/));

  if (View.detect(value)) {
    helpers[name] = makeViewHelper(value);
  } else {
    var boundHelperArgs = slice.call(arguments, 1);
    var boundFn = makeBoundHelper.apply(this, boundHelperArgs);

    helpers[name] = boundFn;
  }
}

export default HandlebarsCompatibleHelper;
