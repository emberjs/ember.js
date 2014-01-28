import SafeString from 'handlebars/safe-string';

export function Placeholder(parent, start, end) {
  if (parent.nodeType === 11 && (start === null || end === null)) {
    throw new Error('a fragment parent must have boundary nodes in order to handle insertion');
  }

  this.parent = parent;
  this.start = start;
  this.end = end;
}

Placeholder.create = function (parent, startIndex, endIndex) {
  var start = startIndex === null ? null : parent.childNodes[startIndex],
      end = endIndex === null ? null : parent.childNodes[endIndex];
  return new Placeholder(parent, start, end);
};

Placeholder.prototype = {
  checkParent: function () {
    if (this.parent !== this.start.parentNode) {
      this.parent = this.start.parentNode;
    }
  },
  clear: function() {
    if (this.parent.nodeType === 11) this.checkParent();

    clear(this.parent, this.start, this.end);
  },
  replace: function(nodeOrString) {
    if (this.parent.nodeType === 11) this.checkParent();

    clear(this.parent, this.start, this.end);
    append(this.parent, this.end, nodeOrString);
  },
  append: function(nodeOrString) {
    if (this.parent.nodeType === 11) this.checkParent();

    append(this.parent, this.end, nodeOrString);
  },
  appendChild: function(node) {
    if (this.parent.nodeType === 11) this.checkParent();

    appendChild(this.parent, this.end, node);
  },
  appendText: function (text) {
    if (this.parent.nodeType === 11) this.checkParent();

    appendText(this.parent, this.end, text);
  },
  appendHTML: function (html) {
    if (this.parent.nodeType === 11) this.checkParent();

    appendHTML(this.parent, this.end, html);
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
