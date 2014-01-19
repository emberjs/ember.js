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

    var parent = this.parent,
        start = this.start,
        end = this.end,
        current, previous;

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
  },
  replace: function(node) {
    this.clear();
    this.parent.insertBefore(node, this.end);
  },
  appendChild: function(node) {
    if (this.parent.nodeType === 11) this.checkParent();

    this.parent.insertBefore(node, this.end);
  },
  appendChildren: function(nodeList) {
    if (this.parent.nodeType === 11) this.checkParent();

    var parent = this.parent,
        ref = this.end,
        i = nodeList.length,
        node;
    while (i--) {
      node = nodeList[i];
      parent.insertBefore(node, ref);
      ref = node;
    }
  },
  appendText: function (str) {
    if (this.parent.nodeType === 11) this.checkParent();

    var parent = this.parent;
    parent.insertBefore(parent.ownerDocument.createTextNode(str), this.end);
  },
  appendHTML: function (html) {
    if (this.parent.nodeType === 11) this.checkParent();

    var parent = this.parent, element;
    if (parent.nodeType === 11) {
      /* TODO require templates always have a contextual element
         instead of element0 = frag */
      element = parent.ownerDocument.createElement('div');
    } else {
      element = parent.cloneNode(false);
    }
    element.innerHTML = html;
    this.appendChildren(element.childNodes);
  }
};
