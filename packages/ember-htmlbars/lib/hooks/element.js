/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core";
import { read } from "ember-metal/streams/utils";
import lookupHelper from "ember-htmlbars/system/lookup-helper";

export default function element(env, domElement, view, path, params, hash) { //jshint ignore:line
  var helper = lookupHelper(path, view, env);
  var valueOrLazyValue;

  if (helper) {
    var options = {
      element: domElement
    };
    valueOrLazyValue = helper.helperFunction.call(undefined, params, hash, options, env);
  } else {
    valueOrLazyValue = view.getStream(path);
  }

  var value = read(valueOrLazyValue);
  if (value) {
    Ember.deprecate('Returning a string of attributes from a helper inside an element is deprecated.');

    var parts = value.toString().split(/\s+/);
    for (var i = 0, l = parts.length; i < l; i++) {
      var attrParts = parts[i].split('=');
      var attrName = attrParts[0];
      var attrValue = attrParts[1];

      attrValue = attrValue.replace(/^['"]/, '').replace(/['"]$/, '');

      env.dom.setAttribute(domElement, attrName, attrValue);
    }
  }
}

