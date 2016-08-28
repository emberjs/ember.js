import DOMHelper from 'dom-helper';
import EmberMorph from '../morphs/morph';
import EmberAttrMorph from '../morphs/attr-morph';

export default function EmberDOMHelper(_document) {
  DOMHelper.call(this, _document);
}

const proto = EmberDOMHelper.prototype = Object.create(DOMHelper.prototype);
proto.MorphClass = EmberMorph;
proto.AttrMorphClass = EmberAttrMorph;
