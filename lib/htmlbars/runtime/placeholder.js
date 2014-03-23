var splice = Array.prototype.splice;

export function Placeholder(parent, start, end) {
  // TODO: this is an internal API, this should be an assert
  if (parent.nodeType === 11 && (start === null || end === null)) {
    throw new Error('a fragment parent must have boundary nodes in order to detect insertion');
  }
  this._parent = parent;
  this.start = start;
  this.end = end;
  this.placeholders = null;
}

Placeholder.create = function (parent, startIndex, endIndex) {
  var childNodes = parent.childNodes,
    start = startIndex === -1 ? null : childNodes[startIndex],
    end = endIndex === -1 ? null : childNodes[endIndex];
  return new Placeholder(parent, start, end);
};

Placeholder.prototype = {
  parent: function () {
    if (this._parent.nodeType === 11 && this._parent !== this.start.parentNode) {
      this._parent = this.start.parentNode;
    }
    return this._parent;
  },
  clear: function() {
    clear(this.parent(), this.start, this.end);
  },
  update: function(nodeOrString) {
    var parent = this.parent();
    clear(parent, this.start, this.end);
    append(parent, this.end, nodeOrString);
  },
  updateNode: function(node) {
    var parent = this.parent();
    clear(parent, this.start, this.end);
    appendChild(parent, this.end, node);
  },
  updateText: function (text) {
    var parent = this.parent();
    clear(parent, this.start, this.end);
    appendText(parent, this.end, text);
  },
  updateHTML: function (html) {
    var parent = this.parent();
    clear(parent, this.start, this.end);
    appendHTML(parent, this.end, html);
  }
};

Placeholder.prototype.replace = function (index, removedLength, addedNodes) {
  if (this.placeholders === null) this.placeholders = [];
  var placeholder = this,
    parent = this.parent(),
    placeholders = this.placeholders,
    before = index > 0 ? placeholders[index-1] : null,
    after = index+removedLength < placeholders.length ? placeholders[index+removedLength] : null,
    start = before === null ? placeholder.start : (before.end === null ? parent.lastChild : before.end.previousSibling),
    end   = after === null ? placeholder.end : (after.start === null ? parent.firstChild : after.start.nextSibling),
    addedLength = addedNodes === undefined ? 0 : addedNodes.length,
    args, i, current;

  if (removedLength > 0) {
    clear(parent, start, end);
  }

  if (addedLength === 0) {
    if (before !== null) {
      before.end = end;
    }
    if (after !== null) {
      after.start = start;
    }
    placeholders.splice(index, removedLength);
    return;
  }

  args = new Array(addedLength+2);
  for (i=0; i<addedLength; i++) {
    append(parent, end, addedNodes[i]);
    if (before !== null) {
      before.end = start.nextSibling;
    }
    args[i+2] = current = new Placeholder(parent, start, end);
    start = end === null ? parent.lastChild : end.previousSibling;
    before = current;
  }

  if (after !== null) {
    after.start = end.previousSibling;
  }

  args[0] = index;
  args[1] = removedLength;

  splice.apply(placeholders, args);
};

function append(parent, end, nodeOrString) {
  if (nodeOrString.nodeType) {
    appendChild(parent, end, nodeOrString);
  } else if (nodeOrString.string) { // SafeString
    appendHTML(parent, end, nodeOrString.string);
  } else {
    appendText(parent, end, nodeOrString);
  }
}

function appendChild(parent, end, node) {
  parent.insertBefore(node, end);
}

function appendText(parent, end, text) {
  var node = parent.ownerDocument.createTextNode(text);
  parent.insertBefore(node, end);
}

function appendHTML(parent, end, html) {
  var element;
  if (parent.nodeType === 11) {
    /* TODO require templates always have a contextual element
       instead of element0 = frag */
    element = parent.ownerDocument.createElement('div');
  } else {
    element = parent.cloneNode(false);
  }
  element.innerHTML = html;
  appendChildren(parent, end, element.childNodes);
}

function appendChildren(parent, end, nodeList) {
  var ref = end,
      i = nodeList.length,
      node;
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

