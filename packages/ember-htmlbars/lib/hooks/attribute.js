/**
@module ember
@submodule ember-htmlbars
*/

import attrNodeTypeFor from "ember-htmlbars/attr_nodes";

export default function attribute(element, attrName, quoted, view, attrValue, options, env) {
  var isAllowed = true;

  if (!Ember.FEATURES.isEnabled('ember-htmlbars-attribute-syntax')) {
    for (var i=0, l=attrValue.length; i<l; i++) {
      if (attrValue[i].isStream) {
        isAllowed = false;
        break;
      }
    }
  }

  if (isAllowed) {
    var AttrNode = attrNodeTypeFor(attrName, element, quoted);
    new AttrNode(element, attrName, attrValue, env.dom);
  } else {
    throw new Error('Bound attributes are not yet supported in Ember.js');
  }
}
