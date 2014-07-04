import Morph from "morph/morph";

var xhtmlNamespace = "http://www.w3.org/1999/xhtml";

/*
 * A class wrapping DOM functions to address environment compatibility,
 * namespaces, contextual elements for morph un-escaped content
 * insertion.
 *
 * When entering a template, a DOMHelper should be passed to provide
 * context to the template. The context is most easily expressed as
 * an element:
 *
 *   template(context, { hooks: hooks, dom: new DOMHelper(element) });
 *
 * In this case, the namespace and ownerDocument of the element will
 * provide context.
 *
 * During fragment creation, a new namespace may be needed. In these
 * cases, a dom helper will be created for the new namespace:
 *
 *   dom1 = new dom0.constructor(null, dom0.document, someNamespaceURI);
 *
 * In this case the namespace and document are passed explicitly,
 * as decided by the parser at compile time, instead of asking the
 * DOMHelper to determine them. There is no contextual element passed,
 * but the contextual element should only be required by the morphs
 * at the root of a document anyway.
 *
 * Helpers and hooks can pass a new DOMHelper or another object as
 * is appropriate:
 *
 *   var svg = document.createElementNS(svgNamespace, 'svg');
 *   morph.render(context, {hooks: env.hooks, dom: new DOMHelper(svg)});
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

prototype.cloneNode = function(element, deep){
  return element.cloneNode(!!deep);
};

prototype.createMorph = function(parent, startIndex, endIndex, contextualElement){
  return Morph.create(parent, startIndex, endIndex, this, contextualElement);
};

prototype.parseHTML = function(html, contextualElement){
  var element;

  if (!contextualElement || contextualElement.nodeType === 11) {
    element = this.document.createElement('div');
  } else {
    element = this.cloneNode(contextualElement, false);
  }

  element.innerHTML = html;
  return element.childNodes;
};

export default DOMHelper;
