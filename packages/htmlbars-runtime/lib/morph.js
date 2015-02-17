import MorphBase from "../morph-range";
import { createObject } from "../htmlbars-util/object-utils";

function HTMLBarsMorph(domHelper, contextualElement) {
  this.super$constructor(domHelper, contextualElement);

  this.state = {};
  this.ownerNode = null;
  this.isDirty = false;
  this.lastYielded = null;
  this.lastResult = null;
  this.lastValue = null;
  this.morphList = null;
  this.morphMap = null;
  this.key = null;
}

HTMLBarsMorph.empty = function(domHelper, contextualElement) {
  var morph = new HTMLBarsMorph(domHelper, contextualElement);
  morph.clear();
  return morph;
};

var prototype = HTMLBarsMorph.prototype = createObject(MorphBase.prototype);
prototype.constructor = HTMLBarsMorph;
prototype.super$constructor = MorphBase;

export default HTMLBarsMorph;
