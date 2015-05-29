/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core";
import { read } from "ember-metal/streams/utils";
import lookupHelper from "ember-htmlbars/system/lookup-helper";

var fakeElement;

function updateElementAttributesFromString(dom, element, string) {
  if (!fakeElement) {
    fakeElement = document.createElement('div');
  }

  fakeElement.innerHTML = '<' + element.tagName + ' ' + string + '><' + '/' + element.tagName + '>';

  var attrs = fakeElement.firstChild.attributes;
  for (var i = 0, l = attrs.length; i < l; i++) {
    var attr = attrs[i];
    if (attr.specified) {
      dom.setAttribute(element, attr.name, attr.value);
    }
  }
}

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
    updateElementAttributesFromString(env.dom, domElement, value);
  }
}
