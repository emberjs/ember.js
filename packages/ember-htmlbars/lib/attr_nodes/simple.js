/**
@module ember
@submodule ember-htmlbars
*/

import run from "ember-metal/run_loop";

function SimpleAttrNode() {
  // abstract class
}

SimpleAttrNode.prototype.init = function init(element, attrName, simpleAttrValue, dom){
  this.element = element;
  this.attrName = attrName;
  this.attrValue = simpleAttrValue;
  this.dom = dom;
  this.isDirty = true;
  this.lastValue = null;
  this.currentValue = null;

  if (this.attrValue.isStream) {
    this.attrValue.subscribe(this.markDirty, this);
    this.renderIfDirty();
  } else {
    this.currentValue = simpleAttrValue;
    this.render();
  }
};

SimpleAttrNode.prototype.markDirty = function markDirty(){
  this.isDirty = true;
  run.schedule('render', this, this.renderIfDirty);
};

SimpleAttrNode.prototype.renderIfDirty = function renderIfDirty(){
  if (this.isDirty) {
    this.isDirty = false;
    var value = this.attrValue.value();
    if (value !== this.currentValue) {
      this.lastValue = this.currentValue;
      this.currentValue = value;
      this.render();
    }
  }
};

SimpleAttrNode.prototype.render = function render(){
  this.dom.setProperty(this.element, this.attrName, this.currentValue);
};

export default SimpleAttrNode;
