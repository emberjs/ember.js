/**
@module ember
@submodule ember-htmlbars
*/

import run from "ember-metal/run_loop";

function ClassNode(stream, renderable) {
  this.stream = stream;
  this.renderable = renderable;
  this.lastValue = null;
  this.currentValue = null;
  this.isDirty = false;
  stream.subscribe(this.update, this);
  this.update();
}

ClassNode.prototype.update = function update(){
  var value = this.stream.value();
  if (value !== this.currentValue) {
    this.isDirty = true;
    this.lastValue = this.currentValue;
    this.currentValue = value;
    this.renderable.renderIfNeeded();
  }
};

var characterRegex = /\S+/;

function QuotedClassAttrNode(element, attrName, attrValue, dom) {
  this.element = element;
  this.attrName = attrName;
  this.dom = dom;
  this.isDirty = false;

  // Filter out spaces
  this.classNodes = []; 
  this.staticClasses = []; 
  for (var i=0, l=attrValue.length;i<l;i++) {
    if (attrValue[i] && attrValue[i].isStream) {
      this.classNodes.push(new ClassNode(attrValue[i], this));
    } else if (attrValue[i]) {
      var matches = attrValue[i].match(characterRegex);
      if (matches && matches[0]) {
        this.staticClasses.push(matches[0]);
      }
    }
  }

  this.renderIfNeeded();
} 

QuotedClassAttrNode.prototype.renderIfNeeded = function renderIfNeeded(){
  this.isDirty = true;
  run.schedule('render', this, this.scheduledRenderIfNeeded);
};

QuotedClassAttrNode.prototype.scheduledRenderIfNeeded = function scheduledRenderIfNeeded(){
  if (this.isDirty) {
    this.isDirty = false;
    this.render();
  }
};

QuotedClassAttrNode.prototype.render = function render(){

  var removeList = [];
  var addList = [];

  if (this.staticClasses) {
    addList = this.staticClasses;
    this.staticClasses = null;
  }

  for (var i=0, l=this.classNodes.length;i<l;i++) {
    if (this.classNodes[i].isDirty) {
      this.classNodes[i].isDirty = false;
      if (this.classNodes[i].lastValue) {
        removeList.push(this.classNodes[i].lastValue);
      }
      if (this.classNodes[i].currentValue) {
        addList.push(this.classNodes[i].currentValue);
      }
    }
  }

  this.dom.removeClasses(this.element, removeList);
  this.dom.addClasses(this.element, addList);

};

export default QuotedClassAttrNode;
