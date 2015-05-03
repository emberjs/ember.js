import { sanitizeAttributeValue } from "./morph-attr/sanitize-attribute-value";
import { isAttrRemovalValue, normalizeProperty } from "./dom-helper/prop";
import { svgNamespace } from "./dom-helper/build-html-dom";
import { getAttrNamespace } from "./htmlbars-util";

function getProperty() {
  return this.domHelper.getPropertyStrict(this.element, this.attrName);
}

function updateProperty(value) {
  if (this._renderedInitially === true || !isAttrRemovalValue(value)) {
    // do not render if initial value is undefined or null
    this.domHelper.setPropertyStrict(this.element, this.attrName, value);
  }

  this._renderedInitially = true;
}

function getAttribute() {
  return this.domHelper.getAttribute(this.element, this.attrName);
}

function updateAttribute(value) {
  if (isAttrRemovalValue(value)) {
    this.domHelper.removeAttribute(this.element, this.attrName);
  } else {
    this.domHelper.setAttribute(this.element, this.attrName, value);
  }
}

function getAttributeNS() {
  return this.domHelper.getAttributeNS(this.element, this.namespace, this.attrName);
}

function updateAttributeNS(value) {
  if (isAttrRemovalValue(value)) {
    this.domHelper.removeAttribute(this.element, this.attrName);
  } else {
    this.domHelper.setAttributeNS(this.element, this.namespace, this.attrName, value);
  }
}

var UNSET = { unset: true };

function AttrMorph(element, attrName, domHelper, namespace) {
  this.element = element;
  this.domHelper = domHelper;
  this.namespace = namespace !== undefined ? namespace : getAttrNamespace(attrName);
  this.state = {};
  this.isDirty = false;
  this.escaped = true;
  this.lastValue = UNSET;
  this.linkedParams = null;
  this.rendered = false;
  this._renderedInitially = false;

  var normalizedAttrName = normalizeProperty(this.element, attrName);
  if (this.namespace) {
    this._update = updateAttributeNS;
    this._get = getAttributeNS;
    this.attrName = attrName;
  } else {
    if (element.namespaceURI === svgNamespace || attrName === 'style' || !normalizedAttrName) {
      this.attrName = attrName;
      this._update = updateAttribute;
      this._get = getAttribute;
    } else {
      this.attrName = normalizedAttrName;
      this._update = updateProperty;
      this._get = getProperty;
    }
  }
}

AttrMorph.prototype.setContent = function (value) {
  if (this.lastValue === value) { return; }
  this.lastValue = value;

  if (this.escaped) {
    var sanitized = sanitizeAttributeValue(this.domHelper, this.element, this.attrName, value);
    this._update(sanitized, this.namespace);
  } else {
    this._update(value, this.namespace);
  }
};

AttrMorph.prototype.getContent = function () {
  var value = this.lastValue = this._get();
  return value;
};

export default AttrMorph;

export { sanitizeAttributeValue };
