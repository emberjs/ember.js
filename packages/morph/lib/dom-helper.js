import Morph from "morph/morph";

var emptyString = '';

var deletesBlankTextNodes = (function(){
  var element = document.createElement('div');
  element.appendChild( document.createTextNode('') );
  var clonedElement = element.cloneNode(true);
  return clonedElement.childNodes.length === 0;
})();

var ignoresCheckedAttribute = (function(){
  var element = document.createElement('input');
  element.setAttribute('checked', 'checked');
  var clonedElement = element.cloneNode(false);
  return !clonedElement.checked;
})();

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
}

var prototype = DOMHelper.prototype;
prototype.constructor = DOMHelper;

prototype.appendChild = function(element, childElement) {
  element.appendChild(childElement);
};

prototype.appendText = function(element, text) {
  element.appendChild(this.document.createTextNode(text));
};

prototype.setAttribute = function(element, name, value) {
  element.setAttribute(name, value);
};

prototype.createElement = function(tagName) {
  if (this.namespaceURI) {
    return this.document.createElementNS(this.namespaceURI, tagName);
  } else {
    return this.document.createElement(tagName);
  }
};

prototype.createDocumentFragment = function(){
  return this.document.createDocumentFragment();
};

prototype.createTextNode = function(text){
  return this.document.createTextNode(text);
};

prototype.repairClonedNode = function(element, blankChildTextNodes, isChecked){
  if (deletesBlankTextNodes && blankChildTextNodes.length > 0) {
    for (var i=0, len=blankChildTextNodes.length;i<len;i++){
      var textNode = document.createTextNode(emptyString),
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
  if (!contextualElement && parent.nodeType === Node.ELEMENT_NODE) {
    contextualElement = parent;
  }
  if (!contextualElement) {
    contextualElement = this.document.body;
  }
  return new Morph(parent, start, end, this, contextualElement);
};

// This helper is just to keep the templates good looking,
// passing integers instead of element references.
prototype.createMorphAt = function(parent, startIndex, endIndex, contextualElement){
  var childNodes = parent.childNodes,
      start = startIndex === -1 ? null : childNodes[startIndex],
      end = endIndex === -1 ? null : childNodes[endIndex];
  return this.createMorph(parent, start, end, contextualElement);
};

prototype.parseHTML = function(html, contextualElement){
  var element = this.cloneNode(contextualElement, false);
  element.innerHTML = html;
  return element.childNodes;
};

export default DOMHelper;
