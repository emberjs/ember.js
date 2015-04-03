/**
@module ember
@submodule ember-htmlbars
*/

import helpers from "ember-htmlbars/helpers";
import View from "ember-views/views/view";
import Component from "ember-views/views/component";
import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import makeBoundHelper from "ember-htmlbars/compat/make-bound-helper";
import { isStream } from "ember-metal/streams/utils";
import { registerKeyword } from "ember-htmlbars/keywords";

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
  this.helperFunction = function helperFunc(params, hash, options, env, scope) {
    var param, fnResult;
    var hasBlock = options.template && options.template.yield;

    var handlebarsOptions = {
      hash: { },
      types: new Array(params.length),
      hashTypes: { }
    };

    handlebarsOptions.hash = {};

    if (hasBlock) {
      handlebarsOptions.fn = function() {
        options.template.yield();
      };
    }

    for (var prop in hash) {
      param = hash[prop];

      handlebarsOptions.hashTypes[prop] = calculateCompatType(param);

      if (isStream(param)) {
        handlebarsOptions.hash[prop] = param.path;
      } else {
        handlebarsOptions.hash[prop] = param;
      }
    }

    var args = new Array(params.length);
    for (var i = 0, l = params.length; i < l; i++) {
      param = params[i];

      handlebarsOptions.types[i] = calculateCompatType(param);

      if (isStream(param)) {
        args[i] = param.path;
      } else {
        args[i] = param;
      }
    }

    handlebarsOptions.legacyGetPath = function(path) {
      return env.hooks.get(env, scope, path).value();
    };

    handlebarsOptions.data = {
      view: env.view
    };

    args.push(handlebarsOptions);

    fnResult = fn.apply(this, args);

    if (options.element) {
      Ember.deprecate("Returning a string of attributes from a helper inside an element is deprecated.");
      applyAttributes(env.dom, options.element, fnResult);
    } else if (!options.template) {
      return fnResult;
    }
  };

  this.isHTMLBars = true;
}

HandlebarsCompatibleHelper.prototype = {
  preprocessArguments() { }
};

export function registerHandlebarsCompatibleHelper(name, value) {
  if (value && value.isLegacyViewHelper) {
    registerKeyword(name, function(morph, env, scope, params, hash, template, inverse, visitor) {
      env.hooks.keyword('view', morph, env, scope, [value.viewClass], hash, template, inverse, visitor);
      return true;
    });
    return;
  }

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

function applyAttributes(dom, element, innerString) {
  var string = "<" + element.tagName + " " + innerString + "></div>";
  var fragment = dom.parseHTML(string, dom.createElement(element.tagName));

  var attrs = fragment.firstChild.attributes;

  for (var i=0, l=attrs.length; i<l; i++) {
    element.setAttributeNode(attrs[i].cloneNode());
  }
}

export default HandlebarsCompatibleHelper;
