import MorphBase from "../morph-range";
import { createObject } from "../htmlbars-util/object-utils";

var guid = 1;

function HTMLBarsMorph(domHelper, contextualElement) {
  this.super$constructor(domHelper, contextualElement);

  this.state = {};
  this.ownerNode = null;
  this.isDirty = false;
  this.isSubtreeDirty = false;
  this.lastYielded = null;
  this.lastResult = null;
  this.lastValue = null;
  this.buildChildEnv = null;
  this.morphList = null;
  this.morphMap = null;
  this.key = null;
  this.linkedParams = null;
  this.linkedResult = null;
  this.rendered = false;
  this.guid = "range" + guid++;
}

HTMLBarsMorph.empty = function(domHelper, contextualElement) {
  var morph = new HTMLBarsMorph(domHelper, contextualElement);
  morph.clear();
  return morph;
};

HTMLBarsMorph.create = function (domHelper, contextualElement, node) {
  var morph = new HTMLBarsMorph(domHelper, contextualElement);
  morph.setNode(node);
  return morph;
};

HTMLBarsMorph.attach = function (domHelper, contextualElement, firstNode, lastNode) {
  var morph = new HTMLBarsMorph(domHelper, contextualElement);
  morph.setRange(firstNode, lastNode);
  return morph;
};

var prototype = HTMLBarsMorph.prototype = createObject(MorphBase.prototype);
prototype.constructor = HTMLBarsMorph;
prototype.super$constructor = MorphBase;

export default HTMLBarsMorph;
