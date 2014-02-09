import SafeString from 'handlebars/safe-string';

export function Placeholder(parent, startIndex, endIndex) {
  if (parent.nodeType === 11 && (startIndex === -1 || endIndex === -1)) {
    throw new Error('a fragment parent must have boundary nodes in order to handle insertion');
  }

  this._parent = parent;
  this.start = startIndex === -1 ? null : parent.childNodes[startIndex];
  this.end = endIndex === -1 ? null : parent.childNodes[endIndex];
}

Placeholder.prototype = {
  parent: function () {
    if (this._parent.nodeType === 11 && this._parent !== this.start.parentNode) {
      this._parent = this.start.parentNode;
    }
    return this._parent;
  },
  append: function(nodeOrString) {
    append(this.parent(), this.end, nodeOrString);
  },
  clear: function() {
    clear(this.parent(), this.start, this.end);
  },
  replace: function(nodeOrString) {
    var parent = this.parent();
    clear(parent, this.start, this.end);
    append(parent, this.end, nodeOrString);
  },
  appendChild: function(node) {
    appendChild(this.parent(), this.end, node);
  },
  appendText: function (text) {
    appendText(this.parent(), this.end, text);
  },
  appendHTML: function (html) {
    appendHTML(this.parent(), this.end, html);
  }
};

export function append(parent, end, nodeOrString) {
  if (typeof nodeOrString === 'string') {
    appendText(parent, end, nodeOrString);
  } else if (nodeOrString instanceof SafeString) {
    appendHTML(parent, end, nodeOrString.toString());
  } else {
    appendChild(parent, end, nodeOrString);
  }
}

export function appendChild(parent, end, node) {
  parent.insertBefore(node, end);
}

export function appendText(parent, end, text) {
  var node = parent.ownerDocument.createTextNode(text);
  parent.insertBefore(node, end);
}

export function appendHTML(parent, end, html) {
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

export function appendChildren(parent, end, nodeList) {
  var ref = end,
      i = nodeList.length,
      node;
  while (i--) {
    node = nodeList[i];
    parent.insertBefore(node, ref);
    ref = node;
  }
}

export function clear(parent, start, end) {
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

