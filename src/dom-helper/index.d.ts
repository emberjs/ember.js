import {
  svgNamespace,
  svgHTMLIntegrationPoints
} from "./lib/build-html-dom";
import {
  addClasses,
  removeClasses
} from "./lib/classes";
import {
  normalizeProperty
} from "./lib/prop";
import { isAttrRemovalValue } from "./lib/prop";

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
// the elements inside that element.
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
  this.uselessElement = this.document.createElement('div');
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

var itemAt;

// It appears that sometimes, in yet to be itentified scenarios PhantomJS 2.0
// crashes on childNodes.item(index), but works as expected with childNodes[index];
//
// Although it would be nice to move to childNodes[index] in all scenarios,
// this would require SimpleDOM to maintain the childNodes array. This would be
// quite costly, in both dev time and runtime.
//
// So instead, we choose the best possible method and call it a day.
//
/*global navigator */
if (typeof navigator !== 'undefined' &&
    navigator.userAgent.indexOf('PhantomJS')) {
  itemAt = function(nodes, index) {
    return nodes[index];
  };
} else {
  itemAt = function(nodes, index) {
    return nodes.item(index);
  };
}

prototype.childAt = function(element, indices) {
  var child = element;

  for (var i = 0; i < indices.length; i++) {
    child = itemAt(child.childNodes, indices[i]);
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

prototype.getAttribute = function(element, name) {
  return element.getAttribute(name);
};

prototype.setAttributeNS = function(element, namespace, name, value) {
  element.setAttributeNS(namespace, name, String(value));
};

prototype.getAttributeNS = function(element, namespace, name) {
  return element.getAttributeNS(namespace, name);
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
  if (value === undefined) {
    value = null;
  }

  if (value === null && (name === 'value' || name === 'type' || name === 'src')) {
    value = '';
  }

  element[name] = value;
};

prototype.getPropertyStrict = function(element, name) {
  return element[name];
};

prototype.setProperty = function(element, name, value, namespace) {
  if (element.namespaceURI === svgNamespace) {
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
    var { normalized , type } = normalizeProperty(element, name);
    if (type === 'prop') {
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

prototype.appendHTMLBefore = function(parent, nextSibling, html) {
  // REFACTOR TODO: table stuff in IE9; maybe just catch exceptions?

  let prev = nextSibling && nextSibling.previousSibling;
  let last;

  if (nextSibling === null) {
    parent.insertAdjacentHTML('beforeEnd', html);
    last = parent.lastChild;
  } else if (nextSibling.nodeType === 3) {
    nextSibling.insertAdjacentHTML('beforeBegin', html);
    last = nextSibling.previousSibling;
  } else {
    parent.insertBefore(this.uselessElement, nextSibling);
    this.uselessElement.insertAdjacentHTML('beforeBegin', html);
    last = this.uselessElement.previousSibling;
    parent.removeChild(this.uselessElement);
  }

  let first = prev ? prev.nextSibling : parent.firstChild;
  return { first, last };
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
