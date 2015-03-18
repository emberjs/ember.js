/**
@module ember
@submodule ember-htmlbars
*/

import {
  read,
  subscribe,
  unsubscribe
} from "ember-metal/streams/utils";
import run from "ember-metal/run_loop";

function AttrNode(attrName, attrValue) {
  this.init(attrName, attrValue);
}

AttrNode.prototype.init = function init(attrName, simpleAttrValue){
  this.isView = true;

  this.tagName = '';
  this.isVirtual = true;

  this.attrName = attrName;
  this.attrValue = simpleAttrValue;
  this.isDirty = true;
  this.lastValue = null;

  subscribe(this.attrValue, this.rerender, this);
};

AttrNode.prototype.renderIfDirty = function renderIfDirty(){
  if (this.isDirty) {
    var value = read(this.attrValue);
    if (value !== this.lastValue) {
      this._renderer.renderTree(this, this._parentView);
    } else {
      this.isDirty = false;
    }
  }
};

AttrNode.prototype.render = function render(buffer) {
  this.isDirty = false;
  var value = read(this.attrValue);

  this._morph.setContent(value);

  this.lastValue = value;
};

AttrNode.prototype.rerender = function render() {
  this.isDirty = true;
  run.schedule('render', this, this.renderIfDirty);
};

AttrNode.prototype.destroy = function render() {
  this.isDirty = false;
  unsubscribe(this.attrValue, this.rerender, this);

  var parent = this._parentView;
  if (parent) { parent.removeChild(this); }
};

AttrNode.prototype.propertyDidChange = function render() {
};

AttrNode.prototype._notifyBecameHidden = function render() {
};

AttrNode.prototype._notifyBecameVisible = function render() {
};

export default AttrNode;
