import DOMHelper from "../morph/dom-helper";

var domHelper = new DOMHelper();

QUnit.module('morph: AttrMorph');

test("can update a dom node", function(){
  var element = document.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'id');
  morph.setContent('twang');
  equal(element.id, 'twang', 'id property is set');
  equal(element.getAttribute('id'), 'twang', 'id attribute is set');
});

test("can update property", function(){
  var element = document.createElement('input');
  var morph = domHelper.createAttrMorph(element, 'disabled');
  morph.setContent(true);
  equal(element.disabled, true, 'disabled property is set');
  morph.setContent(false);
  equal(element.disabled, false, 'disabled property is set');
});

test("can update attribute", function(){
  var element = document.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'data-bop');
  morph.setContent('kpow');
  equal(element.getAttribute('data-bop'), 'kpow', 'data-bop attribute is set');
  morph.setContent(null);
  equal(element.getAttribute('data-bop'), undefined, 'data-bop attribute is removed');
});
