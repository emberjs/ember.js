/**
@module ember
@submodule ember-htmlbars
*/

import run from "ember-metal/run_loop";
import { read, subscribe } from "ember-metal/streams/utils";

var SPACES = /\s+/;
var ADD_LIST = [];
var REMOVE_LIST = [];

// Dedupes and removes empty strings. It expects the array
// to be sorted.
// TODO: This could be done in-place instead of splicing.
function normalizeClasses(array) {
  var i = 0;
  while (i < array.length - 1) {
    if (array[i] === array[i+1]) {
      array.splice(i, 1);
    } else {
      i++;
    }
  }
  if (array[0] === '') {
    array.shift();
  }
}

function buildClasses(value) {
  if (typeof value === 'string') {
    return value.split(SPACES);
  } else {
    return [];
  }
}

function QuotedClassAttrNode(element, attrName, attrValue, dom) {
  this.element = element;
  this.attrName = attrName;
  this.dom = dom;
  this.isDirty = true;

  this.classes = attrValue;
  this.oldClasses = [];

  subscribe(attrValue, this.markDirty, this);
  this.renderIfDirty();
}

QuotedClassAttrNode.prototype.markDirty = function markDirty(){
  this.isDirty = true;
  run.schedule('render', this, this.renderIfDirty);
};

QuotedClassAttrNode.prototype.renderIfDirty = function renderIfDirty(){
  if (this.isDirty) {
    this.isDirty = false;
    this.render();
  }
};

QuotedClassAttrNode.prototype.render = function render(){
  ADD_LIST.length = 0;
  REMOVE_LIST.length = 0;

  var oldClasses = this.oldClasses;
  var newClasses = buildClasses(read(this.classes));
  newClasses.sort();
  normalizeClasses(newClasses);

  var oldIndex = 0;
  var oldLength = oldClasses.length;
  var newIndex = 0;
  var newLength = newClasses.length;

  while (oldIndex < oldLength || newIndex < newLength) {
    var oldClass = oldClasses[oldIndex];
    var newClass = newClasses[newIndex];

    if (oldIndex === oldLength) {
      ADD_LIST.push(newClass);
      newIndex++;
    } else if (newIndex === newLength) {
      REMOVE_LIST.push(oldClass);
      oldIndex++;
    } else {
      if (oldClass === newClass) {
        oldIndex++;
        newIndex++;
      } else if (oldClass < newClass) {
        REMOVE_LIST.push(oldClass);
        oldIndex++;
      } else {
        ADD_LIST.push(newClass);
        newIndex++;
      }
    }
  }

  this.oldClasses = newClasses;

  this.dom.addClasses(this.element, ADD_LIST);
  this.dom.removeClasses(this.element, REMOVE_LIST);
};

export default QuotedClassAttrNode;
