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
import { isStream } from "ember-metal/streams/utils";

var slice = [].slice;

function calculateCompatType(item) {
  if (isStream(item)) {
    return 'ID';
  } else {
    var itemType = typeof item;

    return itemType.toUpperCase();
  }
}

/**
  Wraps an Handlebars helper with an HTMLBars helper for backwards compatibility.

  @class HandlebarsCompatibleHelper
  @constructor
  @private
*/
function HandlebarsCompatibleHelper(fn) {
  this.helperFunction = function helperFunc(params, hash, options, env) {
    var param, blockResult, fnResult;
    var context = env.data.view;
    var handlebarsOptions = {
      hash: { },
      types: new Array(params.length),
      hashTypes: { }
    };

    merge(handlebarsOptions, options);
    merge(handlebarsOptions, env);

    handlebarsOptions.hash = {};

    if (options.isBlock) {
      handlebarsOptions.fn = function() {
        blockResult = options.template.render(context, env, options.morph.contextualElement);
      };

      if (options.inverse) {
        handlebarsOptions.inverse = function() {
          blockResult = options.inverse.render(context, env, options.morph.contextualElement);
        };
      }
    }

    for (var prop in hash) {
      param = hash[prop];

      handlebarsOptions.hashTypes[prop] = calculateCompatType(param);

      if (isStream(param)) {
        handlebarsOptions.hash[prop] = param._label;
      } else {
        handlebarsOptions.hash[prop] = param;
      }
    }

    var args = new Array(params.length);
    for (var i = 0, l = params.length; i < l; i++) {
      param = params[i];

      handlebarsOptions.types[i] = calculateCompatType(param);

      if (isStream(param)) {
        args[i] = param._label;
      } else {
        args[i] = param;
      }
    }
    args.push(handlebarsOptions);

    fnResult = fn.apply(this, args);

    return options.isBlock ? blockResult : fnResult;
  };

  this.isHTMLBars = true;
}

HandlebarsCompatibleHelper.prototype = {
  preprocessArguments() { }
};

export function registerHandlebarsCompatibleHelper(name, value) {
  var helper;

  if (value && value.isHTMLBars) {
    helper = value;
  } else {
    helper = new HandlebarsCompatibleHelper(value);
  }

  helpers[name] = helper;
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
