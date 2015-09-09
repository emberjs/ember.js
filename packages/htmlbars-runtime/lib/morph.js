import MorphBase from "../morph-range";

var guid = 1;

function HTMLBarsMorph(domHelper, contextualElement) {
  this.super$constructor(domHelper, contextualElement);

  this.state = {};
  this.ownerNode = null;
  this.parentMorph = null;
  this.frontBoundary = false;
  this.backBoundary = false;
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
  this.childNodes = null;
  this.rendered = false;
  this.guid = "range" + guid++;
  this.seen = false;

  // these are used in initial render to allow appending to a morph
  // that has no content in it, while avoiding the need for a
  // temporary placeholder node. It should not be consulted after
  // initial render.
  this.nextSibling = null;
  this.appendToParent = null;

  // the isEmpty flag is true when the morph has an empty comment,
  // or during the rendering process when it has no element
  // whatsoever (but rather points to a place in DOM to append to).
  this.isEmpty = true;
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

var prototype = HTMLBarsMorph.prototype = Object.create(MorphBase.prototype);
prototype.constructor = HTMLBarsMorph;
prototype.super$constructor = MorphBase;

prototype.willClear = function() {
  this.lastYielded = null;
  this.lastResult = null;
};

export default HTMLBarsMorph;
