/**
@module ember
@submodule ember-htmlbars
*/

import attrNodeTypeFor from "ember-htmlbars/attr_nodes";

export default function attribute(element, attrName, quoted, view, attrValue, options, env) {
  var AttrNode = attrNodeTypeFor(attrName, element, quoted);
  new AttrNode(element, attrName, attrValue, env.dom);
}
