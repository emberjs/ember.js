/* jshint scripturl:true */

import DOMHelper from "../dom-helper";
import SafeString from "htmlbars-util/safe-string";

var svgNamespace = "http://www.w3.org/2000/svg",
    xlinkNamespace = "http://www.w3.org/1999/xlink";
var domHelper = new DOMHelper();

QUnit.module('AttrMorph');

test("can update a dom node", function(){
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'id');
  morph.setContent('twang');
  equal(element.id, 'twang', 'id property is set');
  equal(element.getAttribute('id'), 'twang', 'id attribute is set');
});

test("can update property", function(){
  var element = domHelper.createElement('input');
  var morph = domHelper.createAttrMorph(element, 'disabled');
  morph.setContent(true);
  equal(element.disabled, true, 'disabled property is set');
  morph.setContent(false);
  equal(element.disabled, false, 'disabled property is set');
});

test("does not add undefined properties on initial render", function(){
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'id');
  morph.setContent(undefined);
  equal(element.id, '', 'property should not be set');
  morph.setContent('foo-bar');
  equal(element.id, 'foo-bar', 'property should be set');
});

test("does not add null properties on initial render", function(){
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'id');
  morph.setContent(null);
  equal(element.id, '', 'property should not be set');
  morph.setContent('foo-bar');
  equal(element.id, 'foo-bar', 'property should be set');
});

test("can update attribute", function(){
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'data-bop');
  morph.setContent('kpow');
  equal(element.getAttribute('data-bop'), 'kpow', 'data-bop attribute is set');
  morph.setContent(null);
  equal(element.getAttribute('data-bop'), undefined, 'data-bop attribute is removed');
});

test("can remove ns attribute with null", function(){
  var element = domHelper.createElement('svg');
  domHelper.setAttribute(element, 'xlink:title', 'Great Title', xlinkNamespace);
  var morph = domHelper.createAttrMorph(element, 'xlink:title', xlinkNamespace);
  morph.setContent(null);
  equal(element.getAttribute('xlink:title'), undefined, 'ns attribute is removed');
});

test("can remove attribute with undefined", function(){
  var element = domHelper.createElement('div');
  element.setAttribute('data-bop', 'kpow');
  var morph = domHelper.createAttrMorph(element, 'data-bop');
  morph.setContent(undefined);
  equal(element.getAttribute('data-bop'), undefined, 'data-bop attribute is removed');
});

test("can remove ns attribute with undefined", function(){
  var element = domHelper.createElement('svg');
  domHelper.setAttribute(element, 'xlink:title', 'Great Title', xlinkNamespace);
  var morph = domHelper.createAttrMorph(element, 'xlink:title', xlinkNamespace);
  morph.setContent(undefined);
  equal(element.getAttribute('xlink:title'), undefined, 'ns attribute is removed');
});

test("can update svg attribute", function(){
  domHelper.setNamespace(svgNamespace);
  var element = domHelper.createElement('svg');
  var morph = domHelper.createAttrMorph(element, 'height');
  morph.setContent('50%');
  equal(element.getAttribute('height'), '50%', 'svg attr is set');
  morph.setContent(null);
  equal(element.getAttribute('height'), undefined, 'svg attr is removed');
});

test("can update style attribute", function(){
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'style');
  morph.setContent('color: red;');
  // IE8 capitalizes css property names and removes trailing semicolons
  var value = element.getAttribute('style');
  value = value.toLowerCase();
  if (value.lastIndexOf(';') !== value.length - 1) {
    value += ';';
  }
  equal(value, 'color: red;', 'style attr is set');
  morph.setContent(null);
  equal(element.getAttribute('style'), undefined, 'style attr is removed');
});

var badTags = [
  { tag: 'a', attr: 'href' },
  { tag: 'body', attr: 'background' },
  { tag: 'link', attr: 'href' },
  { tag: 'img', attr: 'src' },
  { tag: 'iframe', attr: 'src'}
];

for (var i=0, l=badTags.length; i<l; i++) {
  (function(){
    var subject = badTags[i];

    test(subject.tag +" "+subject.attr+" is sanitized when using blacklisted protocol", function() {
      var element = document.createElement(subject.tag);
      var morph = domHelper.createAttrMorph(element, subject.attr);
      morph.setContent('javascript://example.com');

      equal( element.getAttribute(subject.attr),
            'unsafe:javascript://example.com',
            'attribute is escaped');
    });

    test(subject.tag +" "+subject.attr+" is not sanitized when using non-whitelisted protocol with a SafeString", function() {
      var element = document.createElement(subject.tag);
      var morph = domHelper.createAttrMorph(element, subject.attr);
      try {
        morph.setContent(new SafeString('javascript://example.com'));

        equal( element.getAttribute(subject.attr),
              'javascript://example.com',
              'attribute is not escaped');
      } catch(e) {
        // IE does not allow javascript: to be set on img src
        ok(true, 'caught exception '+e);
      }
    });

    test(subject.tag +" "+subject.attr+" is not sanitized when using unsafe attr morph", function() {
      var element = document.createElement(subject.tag);
      var morph = domHelper.createUnsafeAttrMorph(element, subject.attr);
      try {
        morph.setContent('javascript://example.com');

        equal( element.getAttribute(subject.attr),
              'javascript://example.com',
              'attribute is not escaped');
      } catch(e) {
        // IE does not allow javascript: to be set on img src
        ok(true, 'caught exception '+e);
      }
    });

  })(); //jshint ignore:line
}

if (document && document.createElementNS) {

test("detects attribute's namespace if it is not passed as an argument", function () {
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'xlink:href');
  morph.setContent('#circle');
  equal(element.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink', 'attribute has correct namespace');
});

test("can update namespaced attribute", function(){
  domHelper.setNamespace(svgNamespace);
  var element = domHelper.createElement('svg');
  var morph = domHelper.createAttrMorph(element, 'xlink:href', 'http://www.w3.org/1999/xlink');
  morph.setContent('#other');
  equal(element.getAttributeNS('http://www.w3.org/1999/xlink','href'), '#other', 'namespaced attr is set');
  equal(element.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink');
  equal(element.attributes[0].name, 'xlink:href');
  equal(element.attributes[0].localName, 'href');
  equal(element.attributes[0].value, '#other');
  morph.setContent(null);
  // safari returns '' while other browsers return undefined
  equal(!!element.getAttributeNS('http://www.w3.org/1999/xlink','href'), false, 'namespaced attr is removed');
});

}

test("embed src as data uri is sanitized", function() {
  var element = document.createElement('embed');
  var morph = domHelper.createAttrMorph(element, 'src');
  morph.setContent('data:image/svg+xml;base64,PH');

  equal( element.getAttribute('src'),
        'unsafe:data:image/svg+xml;base64,PH',
        'attribute is escaped');
});
