export function Range(parent, start, end) {
  this.parent = parent;
  this.start = start;
  this.end = end;
}

Range.create = function (parent, startIndex, endIndex) {
  var start = startIndex === null ? null : parent.childNodes[startIndex],
      end = endIndex === null ? null : parent.childNodes[endIndex];
  return new Range(parent, start, end);
};

Range.prototype = {
  clear: function() {
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
    this.appendChild(node);
  },
  appendChild: function(node) {
    this.parent.insertBefore(node, this.end);
  },
  appendChildren: function(nodeList) {
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
    this.appendChild(this.parent.ownerDocument.createTextNode(str));
  },
  appendHTML: function (html) {
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
