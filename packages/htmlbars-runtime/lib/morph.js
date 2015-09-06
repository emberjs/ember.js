import MorphBase from "../morph-range";
import { insertBefore } from '../morph-range/utils';
import { assert } from "../htmlbars-util";

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
prototype.super$clear = MorphBase.prototype.clear;
prototype.super$setRange = MorphBase.prototype.setRange;

prototype.nextSibling = function() {
  return this._nextSibling || this.lastNode.nextSibling;
};

prototype.appendNode = function(node) {
  assert(!this.rendered, 'Appending nodes is only supported on first render');
  this.lastNode = node;

  if (!this.firstNode) {
    this.updateFirstNode(node);
  }

  this.appendToParent.insertBefore(node, this.nextSibling);
};

prototype.setRange = function(start, end) {
  let previousFirstNode = this.firstNode;
  this.super$setRange(start, end);

  if (previousFirstNode === null && this.appendToParent) {
    insertBefore(this.appendToParent, start, end, this.nextSibling);
  }

  this.updateFirstNode(start);
  this.updateLastNode(end);
};

prototype.updateFirstNode = function(first) {
  this.firstNode = first;

  if (this.frontBoundary) {
    this.parentMorph.updateFirstNode(first);
  }
};

prototype.updateLastNode = function(last) {
  this.lastNode = last;

  if (this.backBoundary) {
    this.parentMorph.updateLastNode(last);
  }
};

prototype.nextSiblingNode = function() {
  // this.lastNode.nextSibling is intentionally lazy, touching the DOM.
  // it should only be called during initial render, and we should
  // probably eliminate the need for it once things stabilize.
  return this.nextSibling || this.lastNode && this.lastNode.nextSibling;
};

// If the node was evaluated but is still empty, now's the time to fill
// it in with an empty comment.
prototype.nodeEvaluated = function() {
  if (!this.lastNode) {
    this.appendNode(this.domHelper.createComment(''));
  }
  this.nextSibling = null;
  this.appendToParent = null;
  this.updateLastNode(this.lastNode);
  this._syncLastNode();
};

export default HTMLBarsMorph;
