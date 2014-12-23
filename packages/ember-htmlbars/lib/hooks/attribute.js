/**
@module ember
@submodule ember-htmlbars
*/

import attrNodeTypeFor from "ember-htmlbars/attr_nodes";
import EmberError from "ember-metal/error";
import { isStream } from "ember-metal/streams/utils";
import sanitizeAttributeValue from "ember-views/system/sanitize_attribute_value";

var boundAttributesEnabled = false;

if (Ember.FEATURES.isEnabled('ember-htmlbars-attribute-syntax')) {
  boundAttributesEnabled = true;
}

export default function attribute(element, attrName, quoted, view, attrValue, options, env) {
  if (boundAttributesEnabled) {
    var AttrNode = attrNodeTypeFor(attrName, element, quoted);
    new AttrNode(element, attrName, attrValue, env.dom);
  } else {
    if (isStream(attrValue)) {
      throw new EmberError('Bound attributes are not yet supported in Ember.js');
    } else {
      var sanitizedValue = sanitizeAttributeValue(element, attrName, attrValue);
      env.dom.setAttribute(element, attrName, sanitizedValue);
    }
  }
}
