import { sanitizeAttributeValue } from "./attr-morph/sanitize-attribute-value";
import { normalizeProperty } from "./dom-helper/prop";
import { svgNamespace } from "./dom-helper/build-html-dom";

function updateProperty(value) {
  this.domHelper.setPropertyStrict(this.element, this.attrName, value);
}

function updateAttribute(value) {
  if (value === null) {
    this.domHelper.removeAttribute(this.element, this.attrName);
  } else {
    this.domHelper.setAttribute(this.element, this.attrName, value);
  }
}

function AttrMorph(element, attrName, domHelper) {
  this.element = element;
  this.domHelper = domHelper;
  this.escaped = true;

  var normalizedAttrName = normalizeProperty(this.element, attrName);
  if (element.namespaceURI === svgNamespace || attrName === 'style' || !normalizedAttrName) {
    this.attrName = attrName;
    this._update = updateAttribute;
  } else {
    this.attrName = normalizedAttrName;
    this._update = updateProperty;
  }
}

AttrMorph.prototype.setContent = function (value) {
  if (this.escaped) {
    var sanitized = sanitizeAttributeValue(this.element, this.attrName, value);
    this._update(sanitized);
  } else {
    this._update(value);
  }
};

export default AttrMorph;
