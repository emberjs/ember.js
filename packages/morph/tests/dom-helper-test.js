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

test('#parseHTML of tr with contextual table element', function(){
  var tableElement = document.createElement('table'),
      nodes = dom.parseHTML('<tr><td>Yo</td></tr>', tableElement);
  equal(nodes[0].tagName, 'TBODY');
  equal(nodes[0].childNodes[0].tagName, 'TR');
  equal(nodes[0].namespaceURI, xhtmlNamespace);
  equal(nodes[0].childNodes[0].namespaceURI, xhtmlNamespace);
});

// TODO: Basic svg support
/*
test('#createElement of svg with svg namespace', function(){
  var node = dom.createElement('svg');
  equal(node.tagName, 'svg');
  equal(node.namespaceURI, svgNamespace);
  equalHTML(node, '<svg></svg>');
});

test('#createElement of path with svg contextual element', function(){
  var svgElement = document.createElementNS(svgNamespace, 'svg'),
      node = dom.createElement('path');
  equal(node.tagName, 'path');
  equal(node.namespaceURI, svgNamespace);
  equalHTML(node, '<path></path>');
});
*/

// TODO: Safari, Phantom do not return childNodes for SVG
/*
test('#parseHTML of path with svg contextual element', function(){
  var svgElement = document.createElementNS(svgNamespace, 'svg'),
      nodes = dom.parseHTML('<path></path>', svgElement);
  console.log(nodes);
  equal(nodes[0].tagName, 'path');
  equal(nodes[0].namespaceURI, svgNamespace);
});
*/

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
