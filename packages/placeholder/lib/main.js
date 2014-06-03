define("placeholder",
  ["exports"],
  function(__exports__) {
    "use strict";
    var splice = Array.prototype.splice;

    function Placeholder(parent, start, end) {
      // TODO: this is an internal API, this should be an assert
      if (parent.nodeType === 11) {
        if (start === null || end === null) {
          throw new Error('a fragment parent must have boundary nodes in order to detect insertion');
        }
        this.element = null;
      } else {
        this.element = parent;
      }
      this._parent = parent;
      this.start = start;
      this.end = end;
      this.text = null;
      this.owner = null;
      this.placeholders = null;
      this.before = null;
      this.after = null;
      this.escaped = true;
    }

    __exports__.Placeholder = Placeholder;Placeholder.create = function (parent, startIndex, endIndex) {
      var childNodes = parent.childNodes,
        start = startIndex === -1 ? null : childNodes[startIndex],
        end = endIndex === -1 ? null : childNodes[endIndex];
      return new Placeholder(parent, start, end);
    };

    Placeholder.prototype.parent = function () {
      if (!this.element && this._parent !== this.start.parentNode) {
        this.element = this._parent = this.start.parentNode;
      }
      return this._parent;
    };

    Placeholder.prototype.destroy = function () {
      if (this.owner) {
        this.owner.removePlaceholder(this);
      } else {
        clear(this.element || this.parent(), this.start, this.end);
      }
    };

    Placeholder.prototype.removePlaceholder = function (placeholder) {
      var placeholders = this.placeholders;
      for (var i=0, l=placeholders.length; i<l; i++) {
        if (placeholders[i] === placeholder) {
          this.replace(i, 1);
          break;
        }
      }
    };

    Placeholder.prototype.update = function (nodeOrString) {
      this._update(this.element || this.parent(), nodeOrString);
    };

    Placeholder.prototype.updateNode = function (node) {
      var parent = this.element || this.parent();
      if (!node) return this._updateText(parent, '');
      this._updateNode(parent, node);
    };

    Placeholder.prototype.updateText = function (text) {
      this._updateText(this.element || this.parent(), text);
    };

    Placeholder.prototype.updateHTML = function (html) {
      var parent = this.element || this.parent();
      if (!html) return this._updateText(parent, '');
      this._updateHTML(parent, html);
    };

    Placeholder.prototype._update = function (parent, nodeOrString) {
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

    Placeholder.prototype._updateNode = function (parent, node) {
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

    Placeholder.prototype._updateText = function (parent, text) {
      if (this.text) {
        this.text.nodeValue = text;
        return;
      }
      var node = parent.ownerDocument.createTextNode(text);
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

    Placeholder.prototype._updateHTML = function (parent, html) {
      var start = this.start, end = this.end;
      clear(parent, start, end);
      this.text = null;
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
      if (this.before !== null) {
        this.before.end = start.nextSibling;
      }
      if (this.after !== null) {
        this.after.start = end.previousSibling;
      }
    };

    Placeholder.prototype.replace = function (index, removedLength, addedNodes) {
      if (this.placeholders === null) this.placeholders = [];
      var parent = this.element || this.parent(),
        placeholders = this.placeholders,
        before = index > 0 ? placeholders[index-1] : null,
        after = index+removedLength < placeholders.length ? placeholders[index+removedLength] : null,
        start = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling),
        end   = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling),
        addedLength = addedNodes === undefined ? 0 : addedNodes.length,
        args, i, current;

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
        placeholders.splice(index, removedLength);
        return;
      }

      args = new Array(addedLength+2);
      if (addedLength > 0) {
        for (i=0; i<addedLength; i++) {
          args[i+2] = current = new Placeholder(parent, start, end);
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
          after.start = end.previousSibling;
        }
      }

      args[0] = index;
      args[1] = removedLength;

      splice.apply(placeholders, args);
    };

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
  });
