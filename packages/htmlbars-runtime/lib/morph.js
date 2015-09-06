import MorphBase from "../morph-range";
import { insertBefore } from '../morph-range/utils';
import { assert } from "../htmlbars-util";
import { clearMorph } from "../htmlbars-util/template-utils";

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
prototype.super$clear = MorphBase.prototype.clear;
prototype.super$setRange = MorphBase.prototype.setRange;

prototype.nextSibling = function() {
  return this._nextSibling || this.lastNode.nextSibling;
};

prototype.appendNode = function(node) {
  assert(this.appendToParent, 'Appending nodes is only supported during the render process');
  this.lastNode = node;

  if (!this.firstNode) {
    this.updateFirstNode(node);
  }

  this.appendToParent.insertBefore(node, this.nextSibling);
  this.isEmpty = false;
};

prototype.emptyForAppendingToElement = function(element, parent) {
  this.appendToParent = element;
  this.nextSibling = null;

  this.ownerNode = parent.ownerNode;
  this.parentMorph = parent;
};

prototype.emptyForAppendingToMorph = function(morph) {
  this.appendToParent = morph.appendToParent;
  this.nextSibling = morph.nextSibling;

  this.ownerNode = morph.ownerNode;
  this.parentMorph = morph;
};

prototype.prepareForRerender = function(env) {
  if (this.isEmpty) {
    this.prepareEmptyMorphForRender();
  } else {
    clearMorph(this, env, false);
  }
};

prototype.prepareEmptyMorphForRender = function() {
  if (this.appendToParent) { return; }

  let first = this.firstNode;
  assert(first, 'Expected an empty morph preparing for rerender to have an empty comment node');

  let parent = first.parentNode;
  this.appendToParent = parent;
  this.nextSibling = first.nextSibling;
  parent.removeChild(first);
};

prototype.emptyForRerender = function() {
  let { firstNode, lastNode } = this;
  let parent = firstNode.parentNode;

  let node = firstNode;
  let nextNode;

  do {
    nextNode = node.nextSibling;
    parent.removeChild(node);

    if (node === lastNode) { break; }
    node = nextNode;

  } while(node);

  this.firstNode = this.lastNode = null;
  this.appendToParent = parent;
  this.nextSibling = nextNode;
  this.isEmpty = true;
};

prototype.setRange = function(start, end) {
  this.isEmpty = false;
  let previousFirstNode = this.firstNode;
  this.super$setRange(start, end);

  if (previousFirstNode === null && this.appendToParent) {
    insertBefore(this.appendToParent, start, end, this.nextSibling);
  }

  this.updateFirstNode(start);
  this.updateLastNode(end);
};

prototype.clear = function() {
  var node = this.setNode(this.domHelper.createComment(''));
  this.isEmpty = true;
  return node;
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
prototype.evaluated = function() {
  if (!this.lastNode) {
    this.appendNode(this.domHelper.createComment(''));
    this.isEmpty = true;
  }
  this.nextSibling = null;
  this.appendToParent = null;
  this.updateLastNode(this.lastNode);
  this._syncLastNode();
};

prototype.applyResult = function(renderResult) {
  this.lastResult = renderResult;
  this.childNodes = renderResult.morphs;
  this.rendered = true;
};

export default HTMLBarsMorph;
