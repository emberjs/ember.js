/* jshint scripturl:true */

import DOMHelper from "../morph/dom-helper";
import SafeString from "htmlbars-util/safe-string";

var svgNamespace = "http://www.w3.org/2000/svg";
var domHelper = new DOMHelper();

QUnit.module('morph: AttrMorph');

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

test("can update attribute", function(){
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'data-bop');
  morph.setContent('kpow');
  equal(element.getAttribute('data-bop'), 'kpow', 'data-bop attribute is set');
  morph.setContent(null);
  equal(element.getAttribute('data-bop'), undefined, 'data-bop attribute is removed');
});

test("can update svg attribute", function(){
  domHelper.setNamespace(svgNamespace);
  var element = domHelper.createElement('svg');
  var morph = domHelper.createAttrMorph(element, 'viewBox');
  morph.setContent('0 0 0 0');
  equal(element.getAttribute('viewBox'), '0 0 0 0', 'svg attr is set');
  morph.setContent(null);
  equal(element.getAttribute('viewBox'), undefined, 'svg attr is removed');
});

test("can update style attribute", function(){
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'style');
  morph.setContent('color: red;');
  equal(element.getAttribute('style'), 'color: red;', 'style attr is set');
  morph.setContent(null);
  equal(element.getAttribute('style'), undefined, 'style attr is removed');
});

var badTags = [
  { tag: 'a', attr: 'href' },
  { tag: 'body', attr: 'background' },
  { tag: 'link', attr: 'href' },
  { tag: 'img', attr: 'src' },
  { tag: 'iframe', attr: 'src' }
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
