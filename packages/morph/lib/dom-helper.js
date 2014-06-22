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
 * @param {HTMLElement} contextualElement the context element to be used
 *   during parseHTML requests. Will also be used for document and
 *   namespace if they are not provided explicitly.
 * @param {HTMLDocument} _document The document DOM methods are proxied to
 * @param {String} namespace The namespace for these actions
 */
function DOMHelper(contextualElement, _document, namespaceURI){
  this.document = _document || (
    contextualElement ? contextualElement.ownerDocument : document);
  this.namespaceURI = namespaceURI || (
    contextualElement && contextualElement.namespaceURI !== xhtmlNamespace ?
    contextualElement.namespaceURI : null );
  this.contextualElement = contextualElement;
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

prototype.createMorph = function(parent, startIndex, endIndex){
  return Morph.create(parent, startIndex, endIndex, this);
};

prototype.parseHTML = function(html, parent){
  var element;
  // nodeType 11 is a document fragment. This will only
  // occur at the root of a template, and thus we can trust
  // that the contextualElement on the dom-helper is
  // the correct parent node.
  if (!parent || parent.nodeType === 11) {
    if (this.contextualElement){
      element = this.cloneNode(this.contextualElement, false);
    } else {
      // Perhaps this should just throw? It catches the corner
      // case of inner content being svg (like path), but not having
      // a parent or contextual element provided. this.createElement
      // then creates an SVG namespace div, and the inner content
      // ends up being correct.
      element = this.createElement('div');
    }
  } else {
    element = this.cloneNode(parent, false);
  }
  element.innerHTML = html;
  return element.childNodes;
};

prototype.sameAs = function(dom){
  return this.contextualElement === dom.contextualElement &&
         ( this.contextualElement ?
           this.contextualElement.tagName === dom.contextualElement.tagName :
           true ) &&
         this.document === dom.document &&
         this.namespace === dom.namespace;
};

export default DOMHelper;
