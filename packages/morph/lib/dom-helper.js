/* global window:false */
import Morph from "../morph/morph";
import {
  buildHTMLDOM,
  svgNamespace,
  svgHTMLIntegrationPoints
} from "./dom-helper/build-html-dom";
import {
  addClasses,
  removeClasses
} from "./dom-helper/classes";

var doc = typeof document === 'undefined' ? false : document;

var deletesBlankTextNodes = doc && (function(document){
  var element = document.createElement('div');
  element.appendChild( document.createTextNode('') );
  var clonedElement = element.cloneNode(true);
  return clonedElement.childNodes.length === 0;
})(doc);

var ignoresCheckedAttribute = doc && (function(document){
  var element = document.createElement('input');
  element.setAttribute('checked', 'checked');
  var clonedElement = element.cloneNode(false);
  return !clonedElement.checked;
})(doc);

function isSVG(ns){
  return ns === svgNamespace;
}

// This is not the namespace of the element, but of
// the elements inside that elements.
function interiorNamespace(element){
  if (
    element &&
    element.namespaceURI === svgNamespace &&
    !svgHTMLIntegrationPoints[element.tagName]
  ) {
    return svgNamespace;
  } else {
    return null;
  }
}

// The HTML spec allows for "omitted start tags". These tags are optional
// when their intended child is the first thing in the parent tag. For
// example, this is a tbody start tag:
//
// <table>
//   <tbody>
//     <tr>
//
// The tbody may be omitted, and the browser will accept and render:
//
// <table>
//   <tr>
//
// However, the omitted start tag will still be added to the DOM. Here
// we test the string and context to see if the browser is about to
// perform this cleanup.
//
// http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html#optional-tags
// describes which tags are omittable. The spec for tbody and colgroup
// explains this behavior:
//
// http://www.whatwg.org/specs/web-apps/current-work/multipage/tables.html#the-tbody-element
// http://www.whatwg.org/specs/web-apps/current-work/multipage/tables.html#the-colgroup-element
//

var omittedStartTagChildTest = /<([\w:]+)/;
function detectOmittedStartTag(string, contextualElement){
  // Omitted start tags are only inside table tags.
  if (contextualElement.tagName === 'TABLE') {
    var omittedStartTagChildMatch = omittedStartTagChildTest.exec(string);
    if (omittedStartTagChildMatch) {
      var omittedStartTagChild = omittedStartTagChildMatch[1];
      // It is already asserted that the contextual element is a table
      // and not the proper start tag. Just see if a tag was omitted.
      return omittedStartTagChild === 'tr' ||
             omittedStartTagChild === 'col';
    }
  }
}

function buildSVGDOM(html, dom){
  var div = dom.document.createElement('div');
  div.innerHTML = '<svg>'+html+'</svg>';
  return div.firstChild.childNodes;
}

/*
 * A class wrapping DOM functions to address environment compatibility,
 * namespaces, contextual elements for morph un-escaped content
 * insertion.
 *
 * When entering a template, a DOMHelper should be passed:
 *
 *   template(context, { hooks: hooks, dom: new DOMHelper() });
 *
 * TODO: support foreignObject as a passed contextual element. It has
 * a namespace (svg) that does not match its internal namespace
 * (xhtml).
 *
 * @class DOMHelper
 * @constructor
 * @param {HTMLDocument} _document The document DOM methods are proxied to
 */
function DOMHelper(_document){
  this.document = _document || window.document;
  this.namespace = null;
}

var prototype = DOMHelper.prototype;
prototype.constructor = DOMHelper;

prototype.insertBefore = function(element, childElement, referenceChild) {
  return element.insertBefore(childElement, referenceChild);
};

prototype.appendChild = function(element, childElement) {
  return element.appendChild(childElement);
};

prototype.appendText = function(element, text) {
  return element.appendChild(this.document.createTextNode(text));
};

prototype.setAttribute = function(element, name, value) {
  element.setAttribute(name, value);
};

prototype.removeAttribute = function(element, name) {
  element.removeAttribute(name);
};

prototype.setProperty = function(element, name, value) {
  element[name] = value;
};

if (doc && doc.createElementNS) {
  // Only opt into namespace detection if a contextualElement
  // is passed.
  prototype.createElement = function(tagName, contextualElement) {
    var namespace = this.namespace;
    if (contextualElement) {
      if (tagName === 'svg') {
        namespace = svgNamespace;
      } else {
        namespace = interiorNamespace(contextualElement);
      }
    }
    if (namespace) {
      return this.document.createElementNS(namespace, tagName);
    } else {
      return this.document.createElement(tagName);
    }
  };
} else {
  prototype.createElement = function(tagName) {
    return this.document.createElement(tagName);
  };
}

prototype.addClasses = addClasses;
prototype.removeClasses = removeClasses;

prototype.setNamespace = function(ns) {
  this.namespace = ns;
};

prototype.detectNamespace = function(element) {
  this.namespace = interiorNamespace(element);
};

prototype.createDocumentFragment = function(){
  return this.document.createDocumentFragment();
};

prototype.createTextNode = function(text){
  return this.document.createTextNode(text);
};

prototype.createComment = function(text){
  return this.document.createComment(text);
};

prototype.repairClonedNode = function(element, blankChildTextNodes, isChecked){
  if (deletesBlankTextNodes && blankChildTextNodes.length > 0) {
    for (var i=0, len=blankChildTextNodes.length;i<len;i++){
      var textNode = this.document.createTextNode(''),
          offset = blankChildTextNodes[i],
          before = element.childNodes[offset];
      if (before) {
        element.insertBefore(textNode, before);
      } else {
        element.appendChild(textNode);
      }
    }
  }
  if (ignoresCheckedAttribute && isChecked) {
    element.setAttribute('checked', 'checked');
  }
};

prototype.cloneNode = function(element, deep){
  var clone = element.cloneNode(!!deep);
  return clone;
};

prototype.createMorph = function(parent, start, end, contextualElement){
  if (!contextualElement && parent.nodeType === 1) {
    contextualElement = parent;
  }
  return new Morph(parent, start, end, this, contextualElement);
};

prototype.createUnsafeMorph = function(parent, start, end, contextualElement){
  var morph = this.createMorph(parent, start, end, contextualElement);
  morph.escaped = false;
  return morph;
};

// This helper is just to keep the templates good looking,
// passing integers instead of element references.
prototype.createMorphAt = function(parent, startIndex, endIndex, contextualElement){
  var childNodes = parent.childNodes,
      start = startIndex === -1 ? null : childNodes[startIndex],
      end = endIndex === -1 ? null : childNodes[endIndex];
  return this.createMorph(parent, start, end, contextualElement);
};

prototype.createUnsafeMorphAt = function(parent, startIndex, endIndex, contextualElement) {
  var morph = this.createMorphAt(parent, startIndex, endIndex, contextualElement);
  morph.escaped = false;
  return morph;
};

prototype.insertMorphBefore = function(element, referenceChild, contextualElement) {
  var start = this.document.createTextNode('');
  var end = this.document.createTextNode('');
  element.insertBefore(start, referenceChild);
  element.insertBefore(end, referenceChild);
  return this.createMorph(element, start, end, contextualElement);
};

prototype.appendMorph = function(element, contextualElement) {
  var start = this.document.createTextNode('');
  var end = this.document.createTextNode('');
  element.appendChild(start);
  element.appendChild(end);
  return this.createMorph(element, start, end, contextualElement);
};

prototype.parseHTML = function(html, contextualElement) {
  var isSVGContent = (
    isSVG(this.namespace) &&
    !svgHTMLIntegrationPoints[contextualElement.tagName]
  );

  if (isSVGContent) {
    return buildSVGDOM(html, this);
  } else {
    var nodes = buildHTMLDOM(html, contextualElement, this);
    if (detectOmittedStartTag(html, contextualElement)) {
      var node = nodes[0];
      while (node && node.nodeType !== 1) {
        node = node.nextSibling;
      }
      return node.childNodes;
    } else {
      return nodes;
    }
  }
};

export default DOMHelper;
