/**
@module ember
@submodule ember-htmlbars
*/

import { findHelper } from "ember-htmlbars/system/lookup-helper";
import { handleRedirect } from "htmlbars-runtime/hooks";
import { buildHelperStream } from "ember-htmlbars/system/invoke-helper";

var fakeElement;

function updateElementAttributesFromString(element, string) {
  if (!fakeElement) {
    fakeElement = document.createElement('div');
  }

  fakeElement.innerHTML = '<' + element.tagName + ' ' + string + '><' + '/' + element.tagName + '>';

  var attrs = fakeElement.firstChild.attributes;
  for (var i = 0, l = attrs.length; i < l; i++) {
    var attr = attrs[i];
    if (attr.specified) {
      element.setAttribute(attr.name, attr.value);
    }
  }
}

export default function emberElement(morph, env, scope, path, params, hash, visitor) {
  if (handleRedirect(morph, env, scope, path, params, hash, null, null, visitor)) {
    return;
  }

  var result;
  var helper = findHelper(path, scope.self, env);
  if (helper) {
    var helperStream = buildHelperStream(helper, params, hash, { element: morph.element }, env, scope);
    result = helperStream.value();
  } else {
    result = env.hooks.get(env, scope, path);
  }

  var value = env.hooks.getValue(result);
  if (value) {
    Ember.deprecate('Returning a string of attributes from a helper inside an element is deprecated.');
    updateElementAttributesFromString(morph.element, value);
  }
}
