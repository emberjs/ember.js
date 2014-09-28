import {DOMHelper} from "../morph";
import {
  equalHTML,
  isCheckedInputHTML
} from "../test/support/assertions";

var xhtmlNamespace = "http://www.w3.org/1999/xhtml",
    svgNamespace   = "http://www.w3.org/2000/svg";

var dom;

QUnit.module('morph: DOM Helper', {
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
  equalHTML(node, '<div></div>');
});

test('#appendText adds text', function(){
  var node = dom.createElement('div');
  var text = dom.appendText(node, 'Howdy');
  ok(!!text, 'returns node');
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
  equalHTML(node, '<tr></tr>');
});

test('#createMorph has optional contextualElement', function(){
  var parent = document.createElement('div'),
      fragment = document.createDocumentFragment(),
      start = document.createTextNode(''),
      end = document.createTextNode(''),
      morph, thrown;

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

test('#appendMorph', function(){
  var element = document.createElement('div');

  dom.appendText(element, 'a');
  var morph = dom.appendMorph(element);
  dom.appendText(element, 'c');

  morph.update('b');

  equal(element.innerHTML, 'abc');
});

test('#insertMorphBefore', function(){
  var element = document.createElement('div');

  dom.appendText(element, 'a');
  var c = dom.appendText(element, 'c');
  var morph = dom.insertMorphBefore(element, c);

  morph.update('b');

  equal(element.innerHTML, 'abc');
});

test('#parseHTML combinations', function(){
  var parsingCombinations = [
    // omitted start tags
    //
    ['table', '<tr><td>Yo</td></tr>', 'TR'],
    ['table', '<tbody><tr></tr></tbody>', 'TBODY'],
    ['table', '<col></col>', 'COL'],
    // elements with broken innerHTML in IE9 and down
    ['select', '<option></option>', 'OPTION'],
    ['colgroup', '<col></col>', 'COL'],
    ['tbody', '<tr></tr>', 'TR'],
    ['tfoot', '<tr></tr>', 'TR'],
    ['thead', '<tr></tr>', 'TR'],
    ['tr', '<td></td>', 'TD'],
    ['div', '<script></script>', 'SCRIPT']
  ];

  var contextTag, content, expectedTagName, contextElement, nodes;
  for (var p=0;p<parsingCombinations.length;p++) {
    contextTag = parsingCombinations[p][0];
    content = parsingCombinations[p][1];
    expectedTagName = parsingCombinations[p][2];

    contextElement = document.createElement(contextTag);
    nodes = dom.parseHTML(content, contextElement);
    equal(
      nodes[0].tagName, expectedTagName,
      '#parseHTML of '+content+' returns a '+expectedTagName+' inside a '+contextTag+' context' );
  }
});

test('#parseHTML of script then tr inside table context wraps the tr in a tbody', function(){
  var tableElement = document.createElement('table'),
      nodes = dom.parseHTML('<script></script><tr><td>Yo</td></tr>', tableElement);
  // The HTML spec suggests the first item must be the child of
  // the omittable start tag. Here script is the first child, so no-go.
  equal(nodes.length, 2, 'Leading script tag corrupts');
  equal(nodes[0].tagName, 'SCRIPT');
  equal(nodes[1].tagName, 'TBODY');
});

test('#parseHTML with retains whitespace', function(){
  var div = document.createElement('div');
  var nodes = dom.parseHTML('leading<script id="first"></script> <script id="second"></script><div><script></script> <script></script>, indeed.</div>', div);
  equal(nodes[0].data, 'leading');
  equal(nodes[1].tagName, 'SCRIPT');
  equal(nodes[2].data, ' ');
  equal(nodes[3].tagName, 'SCRIPT');
  equal(nodes[4].tagName, 'DIV');
  equal(nodes[4].childNodes[0].tagName, 'SCRIPT');
  equal(nodes[4].childNodes[1].data, ' ');
  equal(nodes[4].childNodes[2].tagName, 'SCRIPT');
  equal(nodes[4].childNodes[3].data, ', indeed.');
});

test('#parseHTML with retains whitespace of top element', function(){
  var div = document.createElement('div');
  var nodes = dom.parseHTML('<span>hello <script id="first"></script> yeah</span>', div);
  equal(nodes[0].tagName, 'SPAN');
  equalHTML(nodes, '<span>hello <script id="first"></script> yeah</span>');
});

test('#parseHTML with retains whitespace after script', function(){
  var div = document.createElement('div');
  var nodes = dom.parseHTML('<span>hello</span><script id="first"></script><span><script></script> kwoop</span>', div);
  equal(nodes[0].tagName, 'SPAN');
  equal(nodes[1].tagName, 'SCRIPT');
  equal(nodes[2].tagName, 'SPAN');
  equalHTML(nodes, '<span>hello</span><script id="first"></script><span><script></script> kwoop</span>');
});

test('#cloneNode shallow', function(){
  var divElement = document.createElement('div');

  divElement.appendChild( document.createElement('span') );

  var node = dom.cloneNode(divElement, false);

  equal(node.tagName, 'DIV');
  equalHTML(node, '<div></div>');
});

test('#cloneNode deep', function(){
  var divElement = document.createElement('div');

  divElement.appendChild( document.createElement('span') );

  var node = dom.cloneNode(divElement, true);

  equal(node.tagName, 'DIV');
  equalHTML(node, '<div><span></span></div>');
});

test('dom node has empty text after cloning and ensuringBlankTextNode', function(){
  var div = document.createElement('div');

  div.appendChild( document.createTextNode('') );

  var clonedDiv = dom.cloneNode(div, true);

  equal(clonedDiv.nodeType, 1);
  equalHTML(clonedDiv, '<div></div>');
  // IE's native cloneNode drops blank string text
  // nodes. Assert repairClonedNode brings back the blank
  // text node.
  dom.repairClonedNode(clonedDiv, [0]);
  equal(clonedDiv.childNodes.length, 1);
  equal(clonedDiv.childNodes[0].nodeType, 3);
});

test('dom node has empty start text after cloning and ensuringBlankTextNode', function(){
  var div = document.createElement('div');

  div.appendChild( document.createTextNode('') );
  div.appendChild( document.createElement('span') );

  var clonedDiv = dom.cloneNode(div, true);

  equal(clonedDiv.nodeType, 1);
  equalHTML(clonedDiv, '<div><span></span></div>');
  // IE's native cloneNode drops blank string text
  // nodes. Assert denormalizeText brings back the blank
  // text node.
  dom.repairClonedNode(clonedDiv, [0]);
  equal(clonedDiv.childNodes.length, 2);
  equal(clonedDiv.childNodes[0].nodeType, 3);
});

test('dom node checked after cloning and ensuringChecked', function(){
  var input = document.createElement('input');

  input.setAttribute('checked', 'checked');
  ok(input.checked, 'input is checked');

  var clone = dom.cloneNode(input, false);

  // IE's native cloneNode copies checked attributes but
  // not the checked property of the DOM node.
  dom.repairClonedNode(clone, [], true);

  isCheckedInputHTML(clone, '<input checked="checked">');
  ok(clone.checked, 'clone is checked');
});

if ('namespaceURI' in document.createElement('div')) {

QUnit.module('morph: DOM Helper namespaces', {
  setup: function() {
    dom = new DOMHelper();
  },
  teardown: function() {
    dom = null;
  }
});

test('#createElement div is xhtml', function(){
  var node = dom.createElement('div');
  equal(node.namespaceURI, xhtmlNamespace);
});

test('#createElement of svg with svg namespace', function(){
  dom.setNamespace(svgNamespace);
  var node = dom.createElement('svg');
  equal(node.tagName, 'svg');
  equal(node.namespaceURI, svgNamespace);
});

test('#createElement of path with detected svg contextual element', function(){
  dom.setNamespace(svgNamespace);
  var node = dom.createElement('path');
  equal(node.tagName, 'path');
  equal(node.namespaceURI, svgNamespace);
});

test('#createElement of path with svg contextual element', function(){
  var node = dom.createElement('path', document.createElementNS(svgNamespace, 'svg'));
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

}
