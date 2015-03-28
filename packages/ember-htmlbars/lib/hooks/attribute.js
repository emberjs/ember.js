/**
@module ember
@submodule ember-htmlbars
*/

import AttrNode from "ember-views/attr_nodes/attr_node";
import EmberError from "ember-metal/error";
import { isStream } from "ember-metal/streams/utils";
import sanitizeAttributeValue from "morph-attr/sanitize-attribute-value";

var boundAttributesEnabled = false;

if (Ember.FEATURES.isEnabled('ember-htmlbars-attribute-syntax')) {
  boundAttributesEnabled = true;
}

export default function attribute(env, morph, element, attrName, attrValue) {
  if (boundAttributesEnabled) {
    var attrNode = new AttrNode(attrName, attrValue);
    attrNode._morph = morph;
    env.data.view.appendChild(attrNode);
  } else {
    if (isStream(attrValue)) {
      throw new EmberError('Bound attributes are not yet supported in Ember.js');
    } else {
      var sanitizedValue = sanitizeAttributeValue(env.dom, element, attrName, attrValue);
      env.dom.setProperty(element, attrName, sanitizedValue);
    }
  }
}
