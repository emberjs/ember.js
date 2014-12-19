/**
@module ember
@submodule ember-htmlbars
*/

import attrNodeTypeFor from "ember-htmlbars/attr_nodes";
import EmberError from "ember-metal/error";
import { isStream } from "ember-metal/streams/utils";

var boundAttributesEnabled = false;

if (Ember.FEATURES.isEnabled('ember-htmlbars-attribute-syntax')) {
  boundAttributesEnabled = true;
}

export default function attribute(element, attrName, quoted, view, attrValue, options, env) {
  if (boundAttributesEnabled) {
    var AttrNode = attrNodeTypeFor(attrName, element);
    new AttrNode(element, attrName, attrValue, env.dom);
  } else {
    if (isStream(attrValue)) {
      throw new EmberError('Bound attributes are not yet supported in Ember.js');
    } else {
      env.dom.setAttribute(element, attrName, attrValue);
    }
  }
}
