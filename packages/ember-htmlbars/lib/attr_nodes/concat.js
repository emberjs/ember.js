/**
@module ember
@submodule ember-htmlbars
*/

import SimpleAttrNode from "./simple";
import { create as o_create } from "ember-metal/platform";

function ConcatAttrNode(element, attrName, attrValue, dom) {
  this.init(element, attrName, attrValue, dom);
} 

ConcatAttrNode.prototype = o_create(SimpleAttrNode.prototype);

ConcatAttrNode.prototype.super$init = SimpleAttrNode.prototype.init;

ConcatAttrNode.prototype.init = function init(element, attrName, attrValue, dom) {
  this.super$init(element, attrName, attrValue, dom);
};

export default ConcatAttrNode;
