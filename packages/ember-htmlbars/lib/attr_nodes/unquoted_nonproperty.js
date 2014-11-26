/**
@module ember
@submodule ember-htmlbars
*/

import SimpleAttrNode from "./simple";
import { create as o_create } from "ember-metal/platform";

function UnquotedNonpropertyAttrNode(element, attrName, attrValue, dom) {
  Ember.assert('Cannot call an unquoted attribute with many streams', attrValue.length === 1);
  var simpleAttrValue = attrValue[0];
  this.init(element, attrName, simpleAttrValue, dom);
} 

UnquotedNonpropertyAttrNode.prototype = o_create(SimpleAttrNode.prototype);

UnquotedNonpropertyAttrNode.prototype.render = function render(){
  if (this.currentValue === null) {
    if (this.lastValue !== null) {
      this.dom.removeAttribute(this.element, this.attrName);
    }
  } else {
    this.dom.setAttribute(this.element, this.attrName, this.currentValue);
  }
};

export default UnquotedNonpropertyAttrNode;
