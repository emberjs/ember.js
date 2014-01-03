export function Range(parent, start, end) {
  this.parent = parent;
  this.start = start;
  this.end = end;
}

Range.prototype = {
  clear: function() {
    var parent = this.parent,
        start = this.start,
        end = this.end,
        current;

    if (end === null) {
      current = node.lastChild;
    } else {
      current = end.previousSibling;
    }

    while (current !== null && current !== start) {
      parent.removeChild(current);
      current = current.previousSibling;
    }
  },
  replace: function(node) {
    this.clear();
    this.appendChild(node);
  },
  appendChild: function(node) {
    var parent = this.parent,
        end = this.end;
    if (end === null) {
      parent.appendChild(node);
    } else {
      parent.insertBefore(node, end);
    }
  }
};
