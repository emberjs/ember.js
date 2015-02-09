import Morph from "../morph-range";
import AttrMorph from "./morph-attr";
import {
  buildHTMLDOM,
  svgNamespace,
  svgHTMLIntegrationPoints
} from "./dom-helper/build-html-dom";
import {
  addClasses,
  removeClasses
} from "./dom-helper/classes";
import {
  normalizeProperty
} from "./dom-helper/prop";
import { isAttrRemovalValue } from "./dom-helper/prop";

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

var canRemoveSvgViewBoxAttribute = doc && (doc.createElementNS ? (function(document){
  var element = document.createElementNS(svgNamespace, 'svg');
  element.setAttribute('viewBox', '0 0 100 100');
  element.removeAttribute('viewBox');
  return !element.getAttribute('viewBox');
})(doc) : true);

var canClone = doc && (function(document){
  var element = document.createElement('div');
  element.appendChild( document.createTextNode(' '));
  element.appendChild( document.createTextNode(' '));
  var clonedElement = element.cloneNode(true);
  return clonedElement.childNodes[0].nodeValue === ' ';
})(doc);

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

function ElementMorph(element, dom, namespace) {
  this.element = element;
  this.dom = dom;
  this.namespace = namespace;

  this.state = {};
  this.isDirty = true;
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
  this.document = _document || document;
  if (!this.document) {
    throw new Error("A document object must be passed to the DOMHelper, or available on the global scope");
  }
  this.canClone = canClone;
  this.namespace = null;
}

var prototype = DOMHelper.prototype;
prototype.constructor = DOMHelper;

prototype.getElementById = function(id, rootNode) {
  rootNode = rootNode || this.document;
  return rootNode.getElementById(id);
};

prototype.insertBefore = function(element, childElement, referenceChild) {
  return element.insertBefore(childElement, referenceChild);
};

prototype.appendChild = function(element, childElement) {
  return element.appendChild(childElement);
};

prototype.childAt = function(element, indices) {
  var child = element;

  for (var i = 0; i < indices.length; i++) {
    child = child.childNodes.item(indices[i]);
  }

  return child;
};

// Note to a Fellow Implementor:
// Ahh, accessing a child node at an index. Seems like it should be so simple,
// doesn't it? Unfortunately, this particular method has caused us a surprising
// amount of pain. As you'll note below, this method has been modified to walk
// the linked list of child nodes rather than access the child by index
// directly, even though there are two (2) APIs in the DOM that do this for us.
// If you're thinking to yourself, "What an oversight! What an opportunity to
// optimize this code!" then to you I say: stop! For I have a tale to tell.
//
// First, this code must be compatible with simple-dom for rendering on the
// server where there is no real DOM. Previously, we accessed a child node
// directly via `element.childNodes[index]`. While we *could* in theory do a
// full-fidelity simulation of a live `childNodes` array, this is slow,
// complicated and error-prone.
//
// "No problem," we thought, "we'll just use the similar
// `childNodes.item(index)` API." Then, we could just implement our own `item`
// method in simple-dom and walk the child node linked list there, allowing
// us to retain the performance advantages of the (surely optimized) `item()`
// API in the browser.
//
// Unfortunately, an enterprising soul named Samy Alzahrani discovered that in
// IE8, accessing an item out-of-bounds via `item()` causes an exception where
// other browsers return null. This necessitated a... check of
// `childNodes.length`, bringing us back around to having to support a
// full-fidelity `childNodes` array!
//
// Worst of all, Kris Selden investigated how browsers are actualy implemented
// and discovered that they're all linked lists under the hood anyway. Accessing
// `childNodes` requires them to allocate a new live collection backed by that
// linked list, which is itself a rather expensive operation. Our assumed
// optimization had backfired! That is the danger of magical thinking about
// the performance of native implementations.
//
// And this, my friends, is why the following implementation just walks the
// linked list, as surprised as that may make you. Please ensure you understand
// the above before changing this and submitting a PR.
//
// Tom Dale, January 18th, 2015, Portland OR
prototype.childAtIndex = function(element, index) {
  var node = element.firstChild;

  for (var idx = 0; node && idx < index; idx++) {
    node = node.nextSibling;
  }

  return node;
};

prototype.appendText = function(element, text) {
  return element.appendChild(this.document.createTextNode(text));
};

prototype.setAttribute = function(element, name, value) {
  element.setAttribute(name, String(value));
};

prototype.setAttributeNS = function(element, namespace, name, value) {
  element.setAttributeNS(namespace, name, String(value));
};

if (canRemoveSvgViewBoxAttribute){
  prototype.removeAttribute = function(element, name) {
    element.removeAttribute(name);
  };
} else {
  prototype.removeAttribute = function(element, name) {
    if (element.tagName === 'svg' && name === 'viewBox') {
      element.setAttribute(name, null);
    } else {
      element.removeAttribute(name);
    }
  };
}

prototype.setPropertyStrict = function(element, name, value) {
  element[name] = value;
};

prototype.setProperty = function(element, name, value, namespace) {
  var lowercaseName = name.toLowerCase();
  if (element.namespaceURI === svgNamespace || lowercaseName === 'style') {
    if (isAttrRemovalValue(value)) {
      element.removeAttribute(name);
    } else {
      if (namespace) {
        element.setAttributeNS(namespace, name, value);
      } else {
        element.setAttribute(name, value);
      }
    }
  } else {
    var normalized = normalizeProperty(element, name);
    if (normalized) {
      element[normalized] = value;
    } else {
      if (isAttrRemovalValue(value)) {
        element.removeAttribute(name);
      } else {
        if (namespace && element.setAttributeNS) {
          element.setAttributeNS(namespace, name, value);
        } else {
          element.setAttribute(name, value);
        }
      }
    }
  }
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
  prototype.setAttributeNS = function(element, namespace, name, value) {
    element.setAttributeNS(namespace, name, String(value));
  };
} else {
  prototype.createElement = function(tagName) {
    return this.document.createElement(tagName);
  };
  prototype.setAttributeNS = function(element, namespace, name, value) {
    element.setAttribute(name, String(value));
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
          before = this.childAtIndex(element, offset);
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

prototype.createAttrMorph = function(element, attrName, namespace){
  return new AttrMorph(element, attrName, this, namespace);
};

prototype.createElementMorph = function(element, namespace){
  return new ElementMorph(element, this, namespace);
};

prototype.createUnsafeAttrMorph = function(element, attrName, namespace){
  var morph = this.createAttrMorph(element, attrName, namespace);
  morph.escaped = false;
  return morph;
};

prototype.createMorph = function(parent, start, end, contextualElement){
  if (contextualElement && contextualElement.nodeType === 11) {
    throw new Error("Cannot pass a fragment as the contextual element to createMorph");
  }

  if (!contextualElement && parent && parent.nodeType === 1) {
    contextualElement = parent;
  }
  var morph = new Morph(this, contextualElement);
  morph.firstNode = start;
  morph.lastNode = end;
  morph.state = {};
  morph.isDirty = true;
  return morph;
};

prototype.createUnsafeMorph = function(parent, start, end, contextualElement){
  var morph = this.createMorph(parent, start, end, contextualElement);
  morph.parseTextAsHTML = true;
  return morph;
};

// This helper is just to keep the templates good looking,
// passing integers instead of element references.
prototype.createMorphAt = function(parent, startIndex, endIndex, contextualElement){
  var single = startIndex === endIndex;
  var start = this.childAtIndex(parent, startIndex);
  var end = single ? start : this.childAtIndex(parent, endIndex);
  return this.createMorph(parent, start, end, contextualElement);
};

prototype.createUnsafeMorphAt = function(parent, startIndex, endIndex, contextualElement) {
  var morph = this.createMorphAt(parent, startIndex, endIndex, contextualElement);
  morph.parseTextAsHTML = true;
  return morph;
};

prototype.insertMorphBefore = function(element, referenceChild, contextualElement) {
  var insertion = this.document.createComment('');
  element.insertBefore(insertion, referenceChild);
  return this.createMorph(element, insertion, insertion, contextualElement);
};

prototype.appendMorph = function(element, contextualElement) {
  var insertion = this.document.createComment('');
  element.appendChild(insertion);
  return this.createMorph(element, insertion, insertion, contextualElement);
};

prototype.insertBoundary = function(fragment, index) {
  // this will always be null or firstChild
  var child = index === null ? null : this.childAtIndex(fragment, index);
  this.insertBefore(fragment, this.createTextNode(''), child);
};

prototype.parseHTML = function(html, contextualElement) {
  var childNodes;

  if (interiorNamespace(contextualElement) === svgNamespace) {
    childNodes = buildSVGDOM(html, this);
  } else {
    var nodes = buildHTMLDOM(html, contextualElement, this);
    if (detectOmittedStartTag(html, contextualElement)) {
      var node = nodes[0];
      while (node && node.nodeType !== 1) {
        node = node.nextSibling;
      }
      childNodes = node.childNodes;
    } else {
      childNodes = nodes;
    }
  }

  // Copy node list to a fragment.
  var fragment = this.document.createDocumentFragment();

  if (childNodes && childNodes.length > 0) {
    var currentNode = childNodes[0];

    // We prepend an <option> to <select> boxes to absorb any browser bugs
    // related to auto-select behavior. Skip past it.
    if (contextualElement.tagName === 'SELECT') {
      currentNode = currentNode.nextSibling;
    }

    while (currentNode) {
      var tempNode = currentNode;
      currentNode = currentNode.nextSibling;

      fragment.appendChild(tempNode);
    }
  }

  return fragment;
};

var parsingNode;

// Used to determine whether a URL needs to be sanitized.
prototype.protocolForURL = function(url) {
  if (!parsingNode) {
    parsingNode = this.document.createElement('a');
  }

  parsingNode.href = url;
  return parsingNode.protocol;
};

export default DOMHelper;
