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
    var parent = this.parent,
        end = this.end;
    if (end === null) {
      parent.appendChild(node);
    } else {
      parent.insertBefore(node, end);
    }
  }
};
