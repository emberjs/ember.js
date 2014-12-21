var propertyCaches = {};

function normalizeProperty(element, attrName) {
  var tagName = element.tagName;
  var cache = propertyCaches[tagName];
  var key;
  if (!cache) {
    cache = {};
    for (key in element) {
      if (element.hasOwnProperty(key)) {
        cache[key.toLowerCase()] = key;
      }
    }
    propertyCaches[tagName] = cache;
  }

  return cache[attrName.toLowerCase()];
}

function updateProperty(value) {
  this.domHelper.setProperty(this.element, this.attrName, value);
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
  if (normalizedAttrName) {
    this.attrName = normalizedAttrName;
    this._update = updateProperty;
  } else {
    this.attrName = attrName;
    this._update = updateAttribute;
  }

  this.reset();
}

AttrMorph.prototype.reset = function() {
  this.owner = null;
};

AttrMorph.prototype.destroy = function () {
  if (this.owner) {
    this.owner.removeMorph(this);
  }
};

AttrMorph.prototype.setContent = function (value) {
  if (this.escaped) {
    // process value to be sanitized
    this._update(value);
  } else {
    this._update(value);
  }
};

export default AttrMorph;
