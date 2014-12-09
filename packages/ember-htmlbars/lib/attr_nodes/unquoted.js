/**
@module ember
@submodule ember-htmlbars
*/

import SimpleAttrNode from "./simple";
import { create as o_create } from "ember-metal/platform";
import { normalizeProperty } from "ember-htmlbars/attr_nodes/utils";

function UnquotedAttrNode(element, attrName, attrValue, dom) {
  var normalizedAttrName = normalizeProperty(element, attrName) || attrName;
  this.init(element, normalizedAttrName, attrValue, dom);
} 

UnquotedAttrNode.prototype = o_create(SimpleAttrNode.prototype);

export default UnquotedAttrNode;
