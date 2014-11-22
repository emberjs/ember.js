var splice = Array.prototype.splice;

function ensureStartEnd(start, end) {
  if (start === null || end === null) {
    throw new Error('a fragment parent must have boundary nodes in order to detect insertion');
  }
}

function ensureContext(contextualElement) {
  if (!contextualElement || contextualElement.nodeType !== 1) {
    throw new Error('An element node must be provided for a contextualElement, you provided ' +
                    (contextualElement ? 'nodeType ' + contextualElement.nodeType : 'nothing'));
  }
}

// TODO: this is an internal API, this should be an assert
function Morph(parent, start, end, domHelper, contextualElement) {
  if (parent.nodeType === 11) {
    ensureStartEnd(start, end);
    this.element = null;
  } else {
    this.element = parent;
  }
  this._parent = parent;
  this.start = start;
  this.end = end;
  this.domHelper = domHelper;
  ensureContext(contextualElement);
  this.contextualElement = contextualElement;
  this.escaped = true;
  this.reset();
}

Morph.prototype.reset = function() {
  this.text = null;
  this.owner = null;
  this.morphs = null;
  this.before = null;
  this.after = null;
};

Morph.prototype.parent = function () {
  if (!this.element) {
    var parent = this.start.parentNode;
    if (this._parent !== parent) {
      this._parent = parent;
    }
    if (parent.nodeType === 1) {
      this.element = parent;
    }
  }
  return this._parent;
};

Morph.prototype.destroy = function () {
  if (this.owner) {
    this.owner.removeMorph(this);
  } else {
    clear(this.element || this.parent(), this.start, this.end);
  }
};

Morph.prototype.removeMorph = function (morph) {
  var morphs = this.morphs;
  for (var i=0, l=morphs.length; i<l; i++) {
    if (morphs[i] === morph) {
      this.replace(i, 1);
      break;
    }
  }
};

Morph.prototype.update = function (nodeOrString) {
  this._update(this.element || this.parent(), nodeOrString);
};

Morph.prototype.updateNode = function (node) {
  var parent = this.element || this.parent();
  if (!node) {
    return this._updateText(parent, '');
  }
  this._updateNode(parent, node);
};

Morph.prototype.updateText = function (text) {
  this._updateText(this.element || this.parent(), text);
};

Morph.prototype.updateHTML = function (html) {
  var parent = this.element || this.parent();
  if (!html) {
    return this._updateText(parent, '');
  }
  this._updateHTML(parent, html);
};

Morph.prototype._update = function (parent, nodeOrString) {
  if (nodeOrString === null || nodeOrString === undefined) {
    this._updateText(parent, '');
  } else if (typeof nodeOrString === 'string') {
    if (this.escaped) {
      this._updateText(parent, nodeOrString);
    } else {
      this._updateHTML(parent, nodeOrString);
    }
  } else if (nodeOrString.nodeType) {
    this._updateNode(parent, nodeOrString);
  } else if (nodeOrString.string) { // duck typed SafeString
    this._updateHTML(parent, nodeOrString.string);
  } else {
    this._updateText(parent, nodeOrString.toString());
  }
};

Morph.prototype._updateNode = function (parent, node) {
  if (this.text) {
    if (node.nodeType === 3) {
      this.text.nodeValue = node.nodeValue;
      return;
    } else {
      this.text = null;
    }
  }
  var start = this.start, end = this.end;
  clear(parent, start, end);
  parent.insertBefore(node, end);
  if (this.before !== null) {
    this.before.end = start.nextSibling;
  }
  if (this.after !== null) {
    this.after.start = end.previousSibling;
  }
};

Morph.prototype._updateText = function (parent, text) {
  if (this.text) {
    this.text.nodeValue = text;
    return;
  }
  var node = this.domHelper.createTextNode(text);
  this.text = node;
  clear(parent, this.start, this.end);
  parent.insertBefore(node, this.end);
  if (this.before !== null) {
    this.before.end = node;
  }
  if (this.after !== null) {
    this.after.start = node;
  }
};

Morph.prototype._updateHTML = function (parent, html) {
  var start = this.start, end = this.end;
  clear(parent, start, end);
  this.text = null;
  var childNodes = this.domHelper.parseHTML(html, this.contextualElement);
  appendChildren(parent, end, childNodes);
  if (this.before !== null) {
    this.before.end = start.nextSibling;
  }
  if (this.after !== null) {
    this.after.start = end.previousSibling;
  }
};

Morph.prototype.append = function (node) {
  if (this.morphs === null) {
    this.morphs = [];
  }
  var index = this.morphs.length;
  return this.insert(index, node);
};

Morph.prototype.insert = function (index, node) {
  if (this.morphs === null) {
    this.morphs = [];
  }
  var parent = this.element || this.parent();
  var morphs = this.morphs;
  var before = index > 0 ? morphs[index-1] : null;
  var after  = index < morphs.length ? morphs[index] : null;
  var start  = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling);
  var end    = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling);
  var morph  = new Morph(parent, start, end, this.domHelper, this.contextualElement);

  morph.owner = this;
  morph._update(parent, node);

  if (before !== null) {
    morph.before = before;
    before.end = start.nextSibling;
    before.after = morph;
  }

  if (after !== null) {
    morph.after = after;
    after.before = morph;
    after.start = end.previousSibling;
  }

  this.morphs.splice(index, 0, morph);
  return morph;
};

Morph.prototype.replace = function (index, removedLength, addedNodes) {
  if (this.morphs === null) {
    this.morphs = [];
  }
  var parent = this.element || this.parent();
  var morphs = this.morphs;
  var before = index > 0 ? morphs[index-1] : null;
  var after = index+removedLength < morphs.length ? morphs[index+removedLength] : null;
  var start = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling);
  var end   = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling);
  var addedLength = addedNodes === undefined ? 0 : addedNodes.length;
  var args, i, current;

  if (removedLength > 0) {
    clear(parent, start, end);
  }

  if (addedLength === 0) {
    if (before !== null) {
      before.after = after;
      before.end = end;
    }
    if (after !== null) {
      after.before = before;
      after.start = start;
    }
    morphs.splice(index, removedLength);
    return;
  }

  args = new Array(addedLength+2);
  if (addedLength > 0) {
    for (i=0; i<addedLength; i++) {
      args[i+2] = current = new Morph(parent, start, end, this.domHelper, this.contextualElement);
      current._update(parent, addedNodes[i]);
      current.owner = this;
      if (before !== null) {
        current.before = before;
        before.end = start.nextSibling;
        before.after = current;
      }
      before = current;
      start = end === null ? parent.lastChild : end.previousSibling;
    }
    if (after !== null) {
      current.after = after;
      after.before = current;
      after.start = end.previousSibling;
    }
  }

  args[0] = index;
  args[1] = removedLength;

  splice.apply(morphs, args);
};

function appendChildren(parent, end, nodeList) {
  var ref = end;
  var i = nodeList.length;
  var node;

  while (i--) {
    node = nodeList[i];
    parent.insertBefore(node, ref);
    ref = node;
  }
}

function clear(parent, start, end) {
  var current, previous;
  if (end === null) {
    current = parent.lastChild;
  } else {
    current = end.previousSibling;
  }

  while (current !== null && current !== start) {
    previous = current.previousSibling;
    parent.removeChild(current);
    current = previous;
  }
}

export default Morph;
