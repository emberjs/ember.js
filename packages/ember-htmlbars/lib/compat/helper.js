/**
@module ember
@submodule ember-htmlbars
*/

import merge from "ember-metal/merge";
import helpers from "ember-htmlbars/helpers";
import View from "ember-views/views/view";
import Component from "ember-views/views/component";
import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import makeBoundHelper from "ember-htmlbars/compat/make-bound-helper";

var slice = [].slice;

/**
  Wraps an Handlebars helper with an HTMLBars helper for backwards compatibility.

  @class HandlebarsCompatibleHelper
  @constructor
  @private
*/
function HandlebarsCompatibleHelper(fn) {
  this.helperFunction = function helperFunc(params, hash, options, env) {
    var param;
    var handlebarsOptions = {};
    merge(handlebarsOptions, options);
    merge(handlebarsOptions, env);

    handlebarsOptions.hash = {};
    for (var prop in hash) {
      param = hash[prop];

      if (param.isStream) {
        handlebarsOptions.hash[prop] = param._label;
      } else {
        handlebarsOptions.hash[prop] = param;
      }
    }

    var args = new Array(params.length);
    for (var i = 0, l = params.length; i < l; i++) {
      param = params[i];

      if (param.isStream) {
        args[i] = param._label;
      } else {
        args[i] = param;
      }
    }
    args.push(handlebarsOptions);

    return fn.apply(this, args);
  };

  this.isHTMLBars = true;
}

HandlebarsCompatibleHelper.prototype = {
  preprocessArguments: function() { }
};

export function registerHandlebarsCompatibleHelper(name, value) {
  helpers[name] = new HandlebarsCompatibleHelper(value);
}

export function handlebarsHelper(name, value) {
  Ember.assert("You tried to register a component named '" + name +
               "', but component names must include a '-'", !Component.detect(value) || name.match(/-/));

  Ember.deprecate('Usage of `Ember.Handlebars.helper` is deprecated. Please use `Ember.HTMLBars.helper`.');

  if (View.detect(value)) {
    helpers[name] = makeViewHelper(value);
  } else {
    var boundHelperArgs = slice.call(arguments, 1);
    var boundFn = makeBoundHelper.apply(this, boundHelperArgs);

    helpers[name] = boundFn;
  }
}

export default HandlebarsCompatibleHelper;
