/**
@module ember
@submodule ember-htmlbars
*/

import SimpleAttrNode from "./simple";
import { create as o_create } from "ember-metal/platform";

function AttributeAttrNode(element, attrName, attrValue, dom) {
  this.init(element, attrName, attrValue, dom);
}

AttributeAttrNode.prototype = o_create(SimpleAttrNode.prototype);

AttributeAttrNode.prototype.render = function render(){
  if (this.currentValue === null) {
    if (this.lastValue !== null) {
      this.dom.removeAttribute(this.element, this.attrName);
    }
  } else {
    this.dom.setAttribute(this.element, this.attrName, this.currentValue);
  }
};

export default AttributeAttrNode;
