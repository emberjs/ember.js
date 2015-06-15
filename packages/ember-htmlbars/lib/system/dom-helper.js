import DOMHelper from "dom-helper";
import EmberMorph from "ember-htmlbars/morphs/morph";
import EmberAttrMorph from "ember-htmlbars/morphs/attr-morph";

function EmberDOMHelper(_document) {
  DOMHelper.call(this, _document);
}

var proto = EmberDOMHelper.prototype = Object.create(DOMHelper.prototype);
proto.MorphClass = EmberMorph;
proto.AttrMorphClass = EmberAttrMorph;

export default EmberDOMHelper;
