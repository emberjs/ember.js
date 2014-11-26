/**
@module ember
@submodule ember-htmlbars
*/

import SimpleAttrNode from "./simple";
import { create as o_create } from "ember-metal/platform";

function UnquotedAttrNode(element, attrName, attrValue, dom) {
  Ember.assert('Cannot call an unquoted attribute with many streams', attrValue.length === 1);
  var simpleAttrValue = attrValue[0];
  this.init(element, attrName, simpleAttrValue, dom);
} 

UnquotedAttrNode.prototype = o_create(SimpleAttrNode.prototype);

export default UnquotedAttrNode;
