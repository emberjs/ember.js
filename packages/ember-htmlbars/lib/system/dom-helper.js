import DOMHelper from "dom-helper";
import EmberMorph from "ember-htmlbars/morphs/morph";
import EmberAttrMorph from "ember-htmlbars/morphs/attr-morph";
import o_create from 'ember-metal/platform/create';

function EmberDOMHelper(_document) {
  DOMHelper.call(this, _document);
}

var proto = EmberDOMHelper.prototype = o_create(DOMHelper.prototype);
proto.MorphClass = EmberMorph;
proto.AttrMorphClass = EmberAttrMorph;

export default EmberDOMHelper;
