/**
@module ember
@submodule ember-htmlbars
*/

import SimpleAttrNode from "./simple";
import { create as o_create } from "ember-metal/platform";

function QuotedAttrNode(element, attrName, attrValue, dom) {
  this.init(element, attrName, attrValue, dom);
} 

QuotedAttrNode.prototype = o_create(SimpleAttrNode.prototype);

QuotedAttrNode.prototype.render = function render(){
  this.dom.setAttribute(this.element, this.attrName, this.currentValue);
};

export default QuotedAttrNode;
