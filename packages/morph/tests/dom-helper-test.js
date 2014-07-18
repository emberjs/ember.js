import {DOMHelper} from "morph";
import {equalHTML} from "test/support/assertions";

var xhtmlNamespace = "http://www.w3.org/1999/xhtml",
    svgNamespace   = "http://www.w3.org/2000/svg";

var dom;

module('htmlbars-runtime: DOM Helper', {
  setup: function() {
    dom = new DOMHelper();
  },
  teardown: function() {
    dom = null;
  }
});

test('#createElement', function(){
  var node = dom.createElement('div');
  equal(node.tagName, 'DIV');
  equal(node.namespaceURI, xhtmlNamespace);
  equalHTML(node, '<div></div>');
});

test('#appendText adds text', function(){
  var node = dom.createElement('div');
  dom.appendText(node, 'Howdy');
  equalHTML(node, '<div>Howdy</div>');
});

test('#setAttribute', function(){
  var node = dom.createElement('div');
  dom.setAttribute(node, 'id', 'super-tag');
  equalHTML(node, '<div id="super-tag"></div>');
});

test('#createElement of tr with contextual table element', function(){
  var tableElement = document.createElement('table'),
      node = dom.createElement('tr');
  equal(node.tagName, 'TR');
  equal(node.namespaceURI, xhtmlNamespace);
  equalHTML(node, '<tr></tr>');
});

test('#createMorph has optional contextualElement', function(){
  var parent = document.createElement('div'),
      fragment = document.createDocumentFragment(),
      start = document.createTextNode(''),
      end = document.createTextNode(''),
      morph, thrown;

  morph = dom.createMorph(fragment, start, end);
  equal(morph.contextualElement, document.body, "morph's body is default contextualElement with fragment parent");

  try {
    morph = dom.createMorph(fragment, start, end, fragment);
  } catch(e) {
    thrown = true;
  }
  ok(thrown, 'Exception thrown when a fragment is provided for contextualElement');

  morph = dom.createMorph(fragment, start, end, parent);
  equal(morph.contextualElement, parent, "morph's contextualElement is parent");

  morph = dom.createMorph(parent, start, end);
  equal(morph.contextualElement, parent, "morph's contextualElement is parent");
});

test('#parseHTML of tr with contextual table element', function(){
  var tableElement = document.createElement('table'),
      nodes = dom.parseHTML('<tr><td>Yo</td></tr>', tableElement);
  equal(nodes[0].tagName, 'TBODY');
  equal(nodes[0].childNodes[0].tagName, 'TR');
  equal(nodes[0].namespaceURI, xhtmlNamespace);
  equal(nodes[0].childNodes[0].namespaceURI, xhtmlNamespace);
});

// TODO: Basic svg support
test('#createElement of svg with svg namespace', function(){
  dom.setNamespace(svgNamespace);
  var node = dom.createElement('svg');
  equal(node.tagName, 'svg');
  equal(node.namespaceURI, svgNamespace);
});

test('#createElement of path with svg contextual element', function(){
  dom.setNamespace(svgNamespace);
  var node = dom.createElement('path');
  equal(node.tagName, 'path');
  equal(node.namespaceURI, svgNamespace);
});

test('#parseHTML of path with svg contextual element', function(){
  dom.setNamespace(svgNamespace);
  var svgElement = document.createElementNS(svgNamespace, 'svg'),
      nodes = dom.parseHTML('<path></path>', svgElement);
  equal(nodes[0].tagName.toLowerCase(), 'path');
  equal(nodes[0].namespaceURI, svgNamespace);
});

test('#parseHTML of stop with linearGradient contextual element', function(){
  dom.setNamespace(svgNamespace);
  var svgElement = document.createElementNS(svgNamespace, 'linearGradient'),
      nodes = dom.parseHTML('<stop />', svgElement);
  equal(nodes[0].tagName.toLowerCase(), 'stop');
  equal(nodes[0].namespaceURI, svgNamespace);
});

test('#cloneNode shallow', function(){
  var divElement = document.createElement('div');

  divElement.appendChild( document.createElement('span') );

  var node = dom.cloneNode(divElement, false);

  equal(node.tagName, 'DIV');
  equal(node.namespaceURI, xhtmlNamespace);
  equalHTML(node, '<div></div>');
});

test('#cloneNode deep', function(){
  var divElement = document.createElement('div');

  divElement.appendChild( document.createElement('span') );

  var node = dom.cloneNode(divElement, true);

  equal(node.tagName, 'DIV');
  equal(node.namespaceURI, xhtmlNamespace);
  equalHTML(node, '<div><span></span></div>');
});

test('dom node has empty text after cloning and ensuringBlankTextNode', function(){
  var div = document.createElement('div');

  div.appendChild( document.createTextNode('') );

  var clonedDiv = dom.cloneNode(div, true);

  equal(clonedDiv.nodeType, Node.ELEMENT_NODE);
  equalHTML(clonedDiv, '<div></div>');
  // IE's native cloneNode drops blank string text
  // nodes. Assert repairClonedNode brings back the blank
  // text node.
  dom.repairClonedNode(clonedDiv, [0]);
  equal(clonedDiv.childNodes.length, 1);
  equal(clonedDiv.childNodes[0].nodeType, Node.TEXT_NODE);
});

test('dom node has empty start text after cloning and ensuringBlankTextNode', function(){
  var div = document.createElement('div');

  div.appendChild( document.createTextNode('') );
  div.appendChild( document.createElement('span') );

  var clonedDiv = dom.cloneNode(div, true);

  equal(clonedDiv.nodeType, Node.ELEMENT_NODE);
  equalHTML(clonedDiv, '<div><span></span></div>');
  // IE's native cloneNode drops blank string text
  // nodes. Assert denormalizeText brings back the blank
  // text node.
  dom.repairClonedNode(clonedDiv, [0]);
  equal(clonedDiv.childNodes.length, 2);
  equal(clonedDiv.childNodes[0].nodeType, Node.TEXT_NODE);
});

test('dom node checked after cloning and ensuringChecked', function(){
  var input = document.createElement('input');

  input.setAttribute('checked', 'checked');
  ok(input.checked, 'input is checked');

  var clone = dom.cloneNode(input, false);

  // IE's native cloneNode copies checked attributes but
  // not the checked property of the DOM node.
  dom.repairClonedNode(clone, [], true);

  equalHTML(clone, '<input checked="checked">');
  ok(clone.checked, 'clone is checked');
});
