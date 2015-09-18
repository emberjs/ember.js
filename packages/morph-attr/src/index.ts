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

var guid = 1;

AttrMorph.create = function(element, attrName, domHelper, namespace) {
  let ns = namespace !== undefined ? namespace : getAttrNamespace(attrName);

  if (ns) {
    return new AttributeNSAttrMorph(element, attrName, domHelper, ns);
  } else {
    let { normalized, type } = normalizeProperty(element, attrName);

    if (element.namespaceURI === svgNamespace || attrName === 'style' || type === 'attr') {
      return new AttributeAttrMorph(element, normalized, domHelper);
    } else {
      return new PropertyAttrMorph(element, normalized, domHelper);
    }
  }
};

function AttrMorph(element, attrName, domHelper) {
  this.element = element;
  this.domHelper = domHelper;
  this.attrName = attrName;
  this.state = {};
  this.isDirty = false;
  this.isSubtreeDirty = false;
  this.escaped = true;
  this.lastValue = UNSET;
  this.lastResult = null;
  this.lastYielded = null;
  this.childNodes = null;
  this.linkedParams = null;
  this.linkedResult = null;
  this.guid = "attr" + guid++;
  this.seen = false;
  this.ownerNode = null;
  this.rendered = false;
  this._renderedInitially = false;
  this.didInit();
}

AttrMorph.prototype.didInit = function() {};
AttrMorph.prototype.willSetContent = function() {};

AttrMorph.prototype.setContent = function (value) {
  this.willSetContent(value);

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

// renderAndCleanup calls `clear` on all items in the morph map
// just before calling `destroy` on the morph.
//
// As a future refactor this could be changed to set the property
// back to its original/default value.
AttrMorph.prototype.clear = function() { };

AttrMorph.prototype.destroy = function() {
  this.element = null;
  this.domHelper = null;
};

function PropertyAttrMorph(element, attrName, domHelper) {
  AttrMorph.call(this, element, attrName, domHelper);
}

PropertyAttrMorph.prototype = Object.create(AttrMorph.prototype);
PropertyAttrMorph.prototype._update = updateProperty;
PropertyAttrMorph.prototype._get = getProperty;

function AttributeNSAttrMorph(element, attrName, domHelper, namespace) {
  AttrMorph.call(this, element, attrName, domHelper);
  this.namespace = namespace;
}

AttributeNSAttrMorph.prototype = Object.create(AttrMorph.prototype);
AttributeNSAttrMorph.prototype._update = updateAttributeNS;
AttributeNSAttrMorph.prototype._get = getAttributeNS;

function AttributeAttrMorph(element, attrName, domHelper) {
  AttrMorph.call(this, element, attrName, domHelper);
}

AttributeAttrMorph.prototype = Object.create(AttrMorph.prototype);
AttributeAttrMorph.prototype._update = updateAttribute;
AttributeAttrMorph.prototype._get = getAttribute;

export default AttrMorph;

export { sanitizeAttributeValue };
